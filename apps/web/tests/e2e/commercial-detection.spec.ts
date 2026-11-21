import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DEMO, createConfirmedUser, localEnv, signInViaUi } from "./helpers";

// Fase 7: publicidade em perfil pessoal. Regras explicáveis, decisão humana e recurso. Nada automático.

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function moderator(browser: Browser) {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  await signInViaUi(page, "moderador@figtherz.local", "Figtherz123");
  await expect(page).toHaveURL(/\/inicio$/);
  return { context, page };
}

async function publish(page: Page, caption: string) {
  await page.goto("/publicar");
  await page.getByLabel("Legenda").fill(caption);
  await page.getByRole("main").getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  return page.url();
}

test.describe("detecção de publicidade", () => {
  test("publicar avisa (sem bloquear) quando o texto parece venda", async ({ page }) => {
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/publicar");
    await page.getByLabel("Legenda").fill("Treino pesado hoje, promoção de faixa do meu parceiro!");
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.getByLabel("Legenda").fill("Kimono novo por R$ 299, chama no direct! Cupom TATAME10");
    await expect(page.getByRole("note")).toContainText("Parece divulgação comercial");
    await expect(page.getByRole("note").getByRole("link", { name: "Criar página comercial" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Publicar" })).toBeEnabled();
  });

  test("fila da moderação mostra motivos explicáveis (seed)", async ({ browser, isMobile }) => {
    test.skip(isMobile, "painel administrativo roda no desktop");
    const mod = await moderator(browser);
    await mod.page.goto("/admin/publicidade");
    const review = mod.page.getByRole("group", { name: "Revisão de @atleta24" });
    await expect(review).toContainText("Cupom ou desconto");
    await expect(review).toContainText("Link de loja, checkout ou WhatsApp");
    await expect(review).toContainText("“cupom”");
    await expectNoAxeViolations(mod.page);
    await mod.context.close();
  });

  test("dois posts de venda abrem revisão; moderação remove; pessoa recorre e a decisão é desfeita", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "fluxo de moderação roda no desktop");
    test.setTimeout(120_000);
    const user = await createConfirmedUser(page, "venda");
    const first = await publish(page, "Rash guard por R$ 149, chama no direct! Cupom LUTA10");
    await publish(page, "Compre já: https://shopee.com.br/faixa-e2e frete grátis");

    // Nada acontece sozinho: o post continua no ar até alguém decidir.
    const visitor = await browser.newContext({ locale: "pt-BR" });
    const vpage = await visitor.newPage();
    await vpage.goto(first);
    await expect(vpage.getByText("Rash guard por R$ 149")).toBeVisible();

    const mod = await moderator(browser);
    await mod.page.goto("/admin/publicidade");
    const review = mod.page.getByRole("group", { name: `Revisão de @${user.username}` });
    await expect(review).toContainText("Preço");
    await review.getByRole("button", { name: "Remover posts e avisar" }).click();
    await expect(review.getByText("Informe o motivo (mínimo 3 caracteres).")).toBeVisible();
    await review.getByLabel(/Motivo da decisão/).fill("Venda de produtos no perfil pessoal");
    await review.getByRole("button", { name: "Remover posts e avisar" }).click();
    await expect(review.getByText("Posts removidos e pessoa avisada.")).toBeVisible();

    await vpage.reload();
    await expect(vpage.getByText("Rash guard por R$ 149")).toHaveCount(0);

    // A pessoa é avisada, vê os motivos e recorre.
    await page.goto("/notificacoes");
    await page.getByRole("link", { name: /registrou publicidade no seu perfil pessoal/ }).first().click();
    await expect(page).toHaveURL(/\/revisoes$/);
    await expect(page.getByRole("heading", { name: "Posts removidos pela moderação" })).toBeVisible();
    await expect(page.getByText("Venda de produtos no perfil pessoal")).toBeVisible();
    await expectNoAxeViolations(page);
    const appeal = page.getByRole("form", { name: "Recorrer da decisão" });
    await appeal.getByLabel(/Recorrer/).fill("curto");
    await appeal.getByRole("button", { name: "Enviar recurso" }).click();
    await expect(page.getByText("Explique em pelo menos 10 caracteres.").first()).toBeVisible();
    await appeal.getByLabel(/Recorrer/).fill("Eram fotos dos meus equipamentos de treino, não vendo nada.");
    await appeal.getByRole("button", { name: "Enviar recurso" }).click();
    await expect(page.getByText("Recurso em análise")).toBeVisible();

    // Moderação aceita: posts voltam.
    await mod.page.reload();
    const appealCard = mod.page.getByRole("group", { name: `Recurso de @${user.username}` });
    await expect(appealCard).toContainText("Eram fotos dos meus equipamentos");
    await appealCard.getByLabel(/Resposta para/).fill("Revisamos e era equipamento pessoal.");
    await appealCard.getByRole("button", { name: "Aceitar recurso (desfazer)" }).click();
    await expect(appealCard.getByText("Recurso aceito: decisão desfeita.")).toBeVisible();

    await vpage.reload();
    await expect(vpage.getByText("Rash guard por R$ 149")).toBeVisible();
    await page.goto("/revisoes");
    await expect(page.getByRole("heading", { name: "Decisão desfeita após recurso" })).toBeVisible();
    await expect(page.getByText("Recurso aceito")).toBeVisible();
    await Promise.all([visitor.close(), mod.context.close()]);
  });

  test("API: usuário comum não decide, não vê risco nem fila", async () => {
    const env = localEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password });
    const risk = await client.from("commercial_risk").select("user_id");
    expect(risk.data ?? []).toEqual([]);
    const queue = await client.from("commercial_reviews").select("id").eq("status", "open");
    expect(queue.data ?? []).toEqual([]);
    const decide = await client.rpc("decide_commercial_review", { p_review: crypto.randomUUID(), p_decision: "dismiss", p_note: "" });
    expect(decide.error?.message).toBe("forbidden");
    const forge = await client.from("commercial_signals").insert({ user_id: crypto.randomUUID(), post_id: crypto.randomUUID(), code: "x", points: 1 });
    expect(forge.error?.code).toBe("42501");
    // As regras são públicas: qualquer pessoa pode conferir um texto.
    const score = await client.rpc("commercial_text_score", { p_text: "Promoção de faixa! Agora sou faixa roxa" });
    expect(score.data).toBe(0);
  });
});
