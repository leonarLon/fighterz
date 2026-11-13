import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DEMO, createConfirmedUser, localEnv, makePng, signInViaUi } from "./helpers";

/** Marca como lidas as notificações da demo (o banco local acumula estado entre execuções). */
async function clearDemoNotifications() {
  const env = localEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  await client.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password });
  await client.rpc("mark_all_notifications_read");
}

async function newUserPage(browser: Browser, tag: string) {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  const user = await createConfirmedUser(page, tag);
  return { context, page, user };
}

async function publish(page: Page, caption: string, withPhoto = false) {
  await page.goto("/publicar");
  await page.getByLabel("Legenda").fill(caption);
  if (withPhoto) {
    await page.locator("#photos").setInputFiles({ name: "treino.png", mimeType: "image/png", buffer: makePng() });
    await page.getByLabel("Descrição da foto 1").fill("Gradiente de teste");
  }
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
}

test.describe("rede social", () => {
  test("feed da demo pagina por cursor sem duplicar", async ({ page }) => {
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    const posts = page.locator("main article[aria-labelledby^='post-']");
    await expect(posts).toHaveCount(20);
    await page.getByRole("button", { name: "Carregar mais" }).click();
    await expect(posts).toHaveCount(40);
    const ids = await posts.evaluateAll((els) => els.map((el) => el.getAttribute("aria-labelledby")));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.describe("fluxos com várias pessoas", () => {
    test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

    test("publicar com foto, curtir, comentar, responder e apagar", async ({ browser }) => {
      const { page, context } = await newUserPage(browser, "autor");
      await publish(page, "Primeiro treino da semana! #oss", true);

      // A imagem foi otimizada, enviada ao bucket privado e servida por URL assinada
      const image = page.getByRole("img", { name: "Gradiente de teste" });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(320);
      expect(await image.getAttribute("src")).toContain("/storage/v1/object/sign/post-media/");

      // Curtir persiste
      const like = page.getByRole("button", { name: /^Curtir \d/ });
      await expect(like).toHaveAttribute("aria-pressed", "false");
      await like.click();
      await expect(like).toHaveAttribute("aria-pressed", "true");
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(like).toHaveAttribute("aria-pressed", "true");
      await expect(like).toHaveAccessibleName("Curtir 1");

      // Comentar e responder
      await page.getByLabel("Escreva um comentário").fill("Bora treinar amanhã?");
      await page.getByRole("button", { name: "Comentar" }).click();
      await expect(page.getByText("Bora treinar amanhã?")).toBeVisible();
      await page.getByRole("button", { name: "Responder" }).click();
      await page.getByPlaceholder(/Responder a @/).fill("Fechado!");
      await page.getByRole("button", { name: "Responder", exact: true }).last().click();
      await expect(page.getByText("Fechado!")).toBeVisible();
      await expect(page.getByRole("heading", { name: /Comentários/ })).toContainText("(2)");

      // Apagar o post
      await page.getByRole("button", { name: "Mais opções" }).click();
      await page.getByRole("menuitem", { name: "Apagar post" }).click();
      const postUrl = page.url();
      await page.getByRole("dialog").getByRole("button", { name: "Apagar" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
      await page.goto(postUrl);
      await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
      await context.close();
    });

    test("marcação com aprovação e contador de notificações em tempo real", async ({ browser }) => {
      await clearDemoNotifications();
      const demoContext = await browser.newContext({ locale: "pt-BR" });
      const demo = await demoContext.newPage();
      await signInViaUi(demo, DEMO.email, DEMO.password);
      await expect(demo).toHaveURL(/\/inicio$/);
      await expect(demo.getByTestId("unread-badge")).toHaveCount(0);

      const { page: author, context } = await newUserPage(browser, "marca");
      await publish(author, "Treino incrível com @demo hoje");

      // Sem recarregar: o Realtime atualiza o contador da demo
      await expect(demo.getByTestId("unread-badge").first()).toBeVisible({ timeout: 15_000 });

      // A marcação só vira link depois de aprovada
      const postUrl = author.url();
      await expect(author.getByRole("link", { name: "@demo" })).toHaveCount(0);
      await demo.goto("/notificacoes");
      await expect(demo.getByTestId("unread-badge")).toHaveCount(0);
      await demo.getByRole("button", { name: "Aprovar marcação" }).first().click();
      await expect(demo.getByText("Marcação aprovada.")).toBeVisible();
      await author.goto(postUrl);
      await expect(author.getByRole("link", { name: "@demo" })).toBeVisible();

      await demoContext.close();
      await context.close();
    });

    test("perfil privado: solicitação, aceite e bloqueio", async ({ browser }) => {
      const owner = await newUserPage(browser, "priv");
      await owner.page.goto("/perfil");
      await owner.page.getByLabel("Perfil privado").check();
      await owner.page.getByRole("button", { name: "Salvar perfil" }).click();
      await expect(owner.page.getByRole("status")).toHaveText("Perfil atualizado.");
      await publish(owner.page, "Post só para quem me segue");

      const fan = await newUserPage(browser, "fan");
      await fan.page.goto(`/u/${owner.user.username}`);
      await expect(fan.page.getByRole("heading", { name: "Este perfil é privado" })).toBeVisible();
      await fan.page.getByRole("button", { name: "Seguir" }).click();
      await expect(fan.page.getByRole("button", { name: "Solicitado" })).toBeVisible();

      await owner.page.goto("/notificacoes");
      await owner.page.getByRole("button", { name: "Aceitar" }).click();
      await expect(owner.page.getByText("Solicitação aceita.")).toBeVisible();

      await fan.page.reload();
      await expect(fan.page.getByRole("button", { name: "Seguindo" })).toBeVisible();
      await expect(fan.page.getByText("Post só para quem me segue")).toBeVisible();

      // Bloqueio: o bloqueado deixa de ver o perfil
      await owner.page.goto(`/u/${fan.user.username}`);
      await owner.page.getByRole("button", { name: "Mais opções do perfil" }).click();
      await owner.page.getByRole("menuitem", { name: "Bloquear" }).click();
      await owner.page.getByRole("dialog").getByRole("button", { name: "Bloquear" }).click();
      await expect(owner.page.getByText("Você bloqueou este perfil.")).toBeVisible();

      await fan.page.reload();
      await expect(fan.page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();

      await owner.context.close();
      await fan.context.close();
    });
  });

  test("explorar: busca de pessoas e posts em alta", async ({ page }) => {
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/explorar");
    await expect(page.getByRole("heading", { name: /Em alta nesta semana/ })).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar pessoas" }).fill("bruna");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("link", { name: /Bruna Tavares/ }).click();
    await expect(page.getByRole("heading", { name: "Bruna Tavares" })).toBeVisible();
  });

  test("denunciar um post", async ({ page, isMobile }) => {
    test.skip(isMobile, "fluxo de UI coberto no desktop");
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    const othersPost = page
      .locator("main article")
      .filter({ hasNot: page.getByRole("link", { name: "Atleta Demo", exact: true }) })
      .first();
    await othersPost.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("menuitem", { name: "Denunciar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Spam ou golpe").check();
    await dialog.getByRole("button", { name: "Enviar denúncia" }).click();
    await expect(dialog.getByRole("status")).toContainText("Denúncia enviada");
  });

  test("visitante vê post público com comentários, mas precisa entrar para interagir", async ({ page }) => {
    await page.goto("/u/atleta1");
    await page.locator("main article").first().getByRole("link", { name: /Comentários/ }).click();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}#comentarios$/);
    await expect(page.getByRole("link", { name: "Entre" })).toBeVisible();
    await page.getByRole("button", { name: /^Curtir \d/ }).first().click();
    await expect(page).toHaveURL(/\/entrar\?next=/);
  });
});
