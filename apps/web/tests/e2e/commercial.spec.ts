import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createConfirmedUser, localEnv, makePng, signInViaUi } from "./helpers";

// Fase 5 da evolução comercial: mídia da academia e páginas de marca, loja e serviço.

async function blockTiles(context: BrowserContext) {
  await context.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204, body: "" }));
}

const test = base.extend({
  context: async ({ context }, provide) => {
    await blockTiles(context);
    await provide(context);
  },
});

async function newContext(browser: Browser) {
  const context = await browser.newContext({ locale: "pt-BR" });
  await blockTiles(context);
  return { context, page: await context.newPage() };
}

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("páginas comerciais (visitante)", () => {
  test("diretório e página da loja: promoção, catálogo e publicação", async ({ page }) => {
    await page.goto("/paginas");
    await expect(page.getByRole("heading", { name: "Marcas, lojas e serviços" })).toBeVisible();
    await page.getByLabel("Tipo").selectOption("store");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("link", { name: /Kimonos Tatame Forte/ }).click();
    await expect(page).toHaveURL(/\/paginas\/kimonos-tatame-forte$/);
    await expect(page.getByRole("heading", { name: "Kimonos Tatame Forte", level: 1 })).toBeVisible();
    const promos = page.getByRole("region", { name: "Promoções" });
    await expect(promos.getByText("Semana do faixa branca")).toBeVisible();
    await expect(promos.getByText("TATAME10")).toBeVisible();
    const catalog = page.getByRole("region", { name: "Produtos e serviços" });
    await expect(catalog.getByText("R$ 449,90")).toBeVisible();
    await expect(catalog.getByText("Consulte o valor")).toBeVisible();
    await expect(page.getByText("Publicado como página")).toBeVisible();
    await expectNoAxeViolations(page);

    // Serviço gratuito aparece como gratuito (nenhum preço inventado).
    await page.goto("/paginas/fisio-luta");
    await expect(page.getByText("Gratuito")).toBeVisible();
    await expect(page.getByLabel("Página verificada")).toBeVisible();
  });

  test("post da página não aparece no perfil pessoal de quem publicou", async ({ page }) => {
    await page.goto("/u/atleta3");
    await expect(page.getByText("Chegou a coleção nova de kimonos trançados!")).toHaveCount(0);
  });
});

test.describe("perfil comercial da academia", () => {
  test("dono envia logo, banner e foto da galeria; visitante vê", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "fluxo de gestão roda no desktop");
    await signInViaUi(page, "atleta5@figtherz.local", "Figtherz123");
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/academias/arena-norte-muay-thai/gerenciar");

    await page.getByLabel(/(Adicionar|Trocar) logo/).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: makePng(500, 500) });
    await expect(page.getByText("Logo atualizado.")).toBeVisible();
    await page.getByLabel(/(Adicionar|Trocar) banner/).setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: makePng(1200, 400) });
    await expect(page.getByText("Banner atualizado.")).toBeVisible();
    const caption = `Treino de sábado ${Date.now().toString(36)}`;
    await page.getByLabel("Legenda da próxima foto (opcional)").fill(caption);
    await page.getByLabel("Adicionar foto à galeria").setInputFiles({ name: "treino.png", mimeType: "image/png", buffer: makePng(800, 600) });
    await expect(page.getByText("Foto adicionada à galeria.")).toBeVisible();
    await expectNoAxeViolations(page);

    const visitor = await newContext(browser);
    await visitor.page.goto("/academias/arena-norte-muay-thai");
    const gallery = visitor.page.getByRole("region", { name: "Fotos" });
    await expect(gallery.getByRole("img", { name: caption })).toBeVisible();
    await expect(gallery.getByText(caption)).toBeVisible();
    const banner = visitor.page.locator("main img[src*='/covers/academy/'][src*='/banner-']");
    await expect(banner).toHaveCount(1);
    await visitor.context.close();

    // Remover a foto tira da página pública.
    await page.reload();
    const photoItem = page.locator("li", { has: page.getByRole("img", { name: caption }) });
    await photoItem.getByRole("button", { name: /Apagar foto/ }).click();
    await expect(page.getByText("Foto apagada.")).toBeVisible();
    await page.goto("/academias/arena-norte-muay-thai");
    await expect(page.getByRole("img", { name: caption })).toHaveCount(0);
  });
});

test.describe("página de marca, loja ou serviço (gestão)", () => {
  test("criar, catálogo, promoção, administrador, publicar como página e ocultar", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "fluxo de gestão roda no desktop");
    test.setTimeout(120_000);
    await createConfirmedUser(page, "loja");
    const name = `Loja E2E ${Date.now().toString(36)}`;

    // Criar: o tipo é obrigatório.
    await page.goto("/paginas/nova");
    await page.getByLabel("Nome da página").fill(name);
    await page.getByRole("button", { name: "Criar página" }).click();
    await expect(page.getByText("Escolha o tipo da página.")).toBeVisible();
    await page.getByLabel("Loja").check();
    await page.getByRole("button", { name: "Criar página" }).click();
    await expect(page).toHaveURL(/\/paginas\/loja-e2e-[a-z0-9-]+\/gerenciar$/);
    const slug = page.url().split("/paginas/")[1]!.replace("/gerenciar", "");

    await page.getByLabel("Descrição", { exact: true }).fill("Equipamentos para treino.");
    await page.getByLabel("Cidade (opcional)").fill("Curitiba");
    await page.getByRole("button", { name: "Salvar dados" }).click();
    await expect(page.getByText("Dados da página salvos.")).toBeVisible();

    // Catálogo: erro de valor, correção (a escolha "Tem preço" não se perde após o erro).
    await page.locator("summary", { hasText: "Adicionar item" }).click();
    const itemForm = page.getByRole("form", { name: "Novo item do catálogo" });
    await itemForm.getByLabel("Nome").fill("Luva de boxe 12 oz");
    await itemForm.getByLabel("Tem preço").check();
    await itemForm.getByRole("button", { name: "Adicionar ao catálogo" }).click();
    await expect(itemForm.getByText("Informe o valor. Ex.: 199,90")).toBeVisible();
    await itemForm.getByLabel("Valor (R$)").fill("249,90");
    await itemForm.getByRole("button", { name: "Adicionar ao catálogo" }).click();
    await expect(page.locator("span.font-semibold", { hasText: "Luva de boxe 12 oz" })).toBeVisible();
    await expect(page.getByText(/Produto · R\$ 249,90/)).toBeVisible();

    // Promoção com cupom.
    await page.locator("summary", { hasText: "Nova promoção" }).click();
    const promoForm = page.getByRole("form", { name: "Nova promoção" });
    await promoForm.getByLabel("Título").fill("Abertura da loja");
    await promoForm.getByLabel("Cupom (opcional)").fill("abertura15");
    await promoForm.getByRole("button", { name: "Criar promoção" }).click();
    await expect(page.locator("span.font-semibold", { hasText: "Abertura da loja" })).toBeVisible();

    // Convite de administrador: atleta1 aceita em /paginas.
    await page.getByLabel("Convidar administrador").fill("@atleta1");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado para @atleta1.")).toBeVisible();
    const admin = await newContext(browser);
    await signInViaUi(admin.page, "atleta1@figtherz.local", "Figtherz123");
    await expect(admin.page).toHaveURL(/\/inicio$/);
    await admin.page.goto("/paginas");
    const invite = admin.page.locator("#convites li", { hasText: name });
    await invite.getByRole("button", { name: "Aceitar convite" }).click();
    await expect(invite.getByText("Convite aceito.")).toBeVisible();

    // Administrador publica como a página.
    await admin.page.goto("/publicar");
    const caption = `Novidade da ${name}`;
    await admin.page.getByLabel("Legenda").fill(caption);
    await admin.page.getByLabel("Publicar como").selectOption({ label: `Página: ${name}` });
    await admin.page.getByRole("button", { name: "Publicar" }).last().click();
    await expect(admin.page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    await expect(admin.page.getByText("Publicado como página")).toBeVisible();
    await admin.page.goto("/u/atleta1");
    await expect(admin.page.getByText(caption)).toHaveCount(0);
    await admin.context.close();

    // Visitante vê tudo na página pública.
    const visitor = await newContext(browser);
    await visitor.page.goto(`/paginas/${slug}`);
    await expect(visitor.page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(visitor.page.getByText("R$ 249,90")).toBeVisible();
    await expect(visitor.page.getByText("ABERTURA15")).toBeVisible();
    await expect(visitor.page.getByText(caption)).toBeVisible();

    // Ocultar: visitante deixa de ver.
    await page.getByRole("button", { name: "Ocultar página" }).click();
    await expect(page.getByText("A página está oculta.")).toBeVisible();
    const hidden = await visitor.page.goto(`/paginas/${slug}`);
    expect(hidden?.status()).toBe(404);
    await visitor.context.close();
  });

  test("API direta: quem não gerencia não altera nem publica como a página", async () => {
    const env = localEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: "demo@figtherz.local", password: "Figtherz123" });
    const { data: biz } = await client.from("businesses").select("id").eq("slug", "kimonos-tatame-forte").single();
    const update = await client.from("businesses").update({ description: "invadido" }).eq("id", biz!.id).select();
    expect(update.data ?? []).toEqual([]);
    const item = await client.from("business_items").insert({ business_id: biz!.id, name: "Intruso" });
    expect(item.error?.code).toBe("42501");
    const post = await client.rpc("create_page_post", { p_business: biz!.id, p_id: crypto.randomUUID(), p_caption: "Fingindo ser a loja" });
    expect(post.error?.message).toBe("not_business_manager");
    const members = await client.from("business_members").select("user_id").eq("business_id", biz!.id);
    expect(members.data ?? []).toEqual([]);
  });
});
