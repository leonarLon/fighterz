import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createConfirmedUser, DEMO, formAlert, signInViaUi } from "./helpers";

const MOD = { email: "moderador@figtherz.local", password: "Figtherz123" };
const ADMIN = { email: "admin@figtherz.local", password: "Figtherz123" };

async function newPage(browser: Browser) {
  const context = await browser.newContext({ locale: "pt-BR" });
  await context.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204, body: "" }));
  return { context, page: await context.newPage() };
}

async function signIn(page: Page, who: { email: string; password: string }) {
  await signInViaUi(page, who.email, who.password);
  await expect(page).toHaveURL(/\/inicio$/);
}

test.describe("acesso ao painel", () => {
  test("usuário comum recebe 404 em /admin", async ({ page }) => {
    await signIn(page, DEMO);
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await page.goto("/configuracoes");
    await expect(page.getByRole("link", { name: "Painel de administração" })).toHaveCount(0);
  });

  test("moderador vê a fila priorizada, mas não as áreas de admin", async ({ page }) => {
    await signIn(page, MOD);
    await page.goto("/configuracoes");
    await page.getByRole("link", { name: "Painel de administração" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Painel de administração" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Administração" });
    await expect(nav.getByRole("link", { name: /Denúncias/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Modalidades" })).toHaveCount(0);
    expect((await page.goto("/admin/modalidades"))?.status()).toBe(404);

    await page.goto("/admin/denuncias");
    const first = page.locator("main article").first();
    await expect(first).toContainText("Segurança de menores");
    await expect(first).toContainText("de @atleta25");
  });

  test("visitante que tenta denunciar academia vai para o login", async ({ page }) => {
    await page.goto("/academias/tatame-central");
    await page.getByRole("button", { name: "Denunciar" }).click();
    await expect(page).toHaveURL(/\/entrar\?next=%2Facademias%2Ftatame-central/);
  });
});

test.describe("moderação ponta a ponta", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("denúncia → remoção com motivo → suspensão bloqueia login", async ({ browser }) => {
    // Autor do conteúdo
    const offender = await newPage(browser);
    const user = await createConfirmedUser(offender.page, "infrator");
    const caption = `Promoção imperdível ${Date.now().toString(36)}`;
    await offender.page.goto("/publicar");
    await offender.page.getByLabel("Legenda").fill(caption);
    await offender.page.getByRole("button", { name: "Publicar" }).click();
    await expect(offender.page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    const postUrl = offender.page.url();

    // Denúncia pela interface
    const reporter = await newPage(browser);
    await signIn(reporter.page, DEMO);
    await reporter.page.goto(postUrl);
    await reporter.page.locator("main article").first().getByRole("button", { name: "Mais opções" }).click();
    await reporter.page.getByRole("menuitem", { name: "Denunciar" }).click();
    const dialog = reporter.page.getByRole("dialog");
    await dialog.getByLabel("Spam ou golpe").check();
    await dialog.getByRole("button", { name: "Enviar denúncia" }).click();
    await expect(dialog.getByRole("status")).toContainText("Denúncia enviada");

    // Moderação: remover com motivo obrigatório
    const mod = await newPage(browser);
    await signIn(mod.page, MOD);
    await mod.page.goto("/admin/denuncias");
    const item = mod.page.locator("main article").filter({ hasText: caption });
    await expect(item).toContainText(`de @${user.username}`);
    const remove = item.getByRole("button", { name: "Remover post" });
    await expect(remove).toBeDisabled();
    await item.getByLabel("Motivo da decisão").fill("Spam comercial");
    await remove.click();
    await expect(item.getByRole("status")).toHaveText("Conteúdo removido e denúncias resolvidas.");

    // Some para os outros; o autor vê o aviso
    await reporter.page.goto(postUrl);
    await expect(reporter.page.getByText(caption)).toHaveCount(0);
    await offender.page.goto(postUrl);
    await expect(offender.page.getByText("Este post foi removido pela moderação")).toBeVisible();
    await offender.page.goto("/notificacoes");
    await expect(offender.page.getByText("Equipe Fighterz removeu um post seu por violar as diretrizes")).toBeVisible();

    // Suspensão de 1 dia pela página de usuários
    await mod.page.goto(`/admin/usuarios?q=${user.username}`);
    const row = mod.page.locator("main article").filter({ hasText: `@${user.username}` });
    await row.getByText("Ações").click();
    await row.getByLabel("Motivo").fill("Spam repetido");
    await row.getByLabel("Prazo").selectOption("1");
    await row.getByRole("button", { name: "Suspender" }).click();
    await expect(row.getByRole("status")).toHaveText("Conta suspensa por 1 dia.");

    // Histórico registra as duas decisões
    await mod.page.goto("/admin/historico");
    await expect(mod.page.getByText("Spam comercial").first()).toBeVisible();
    await expect(mod.page.getByText(/Spam repetido/).first()).toBeVisible();

    // O infrator não consegue mais entrar
    const again = await newPage(browser);
    await signInViaUi(again.page, user.email, user.password);
    await expect(formAlert(again.page)).toContainText("Esta conta está suspensa");

    for (const c of [offender, reporter, mod, again]) await c.context.close();
  });

  test("admin publica aviso e fecha cadastros (e reabre)", async ({ browser }) => {
    const admin = await newPage(browser);
    await signIn(admin.page, ADMIN);
    const visitor = await newPage(browser);
    try {
      await admin.page.goto("/admin/configuracoes");
      await admin.page.getByLabel("Aviso no topo do site (opcional)").fill("Manutenção programada no domingo.");
      await admin.page.getByLabel("Cadastros abertos").uncheck();
      await admin.page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(admin.page.getByText("Configurações salvas.")).toBeVisible();

      await visitor.page.goto("/cadastro");
      await expect(visitor.page.getByRole("complementary", { name: "Aviso da plataforma" })).toContainText("Manutenção programada no domingo.");
      await expect(visitor.page.getByText("Novos cadastros estão temporariamente fechados.")).toBeVisible();
      await expect(visitor.page.getByRole("button", { name: "Criar conta" })).toHaveCount(0);
    } finally {
      await admin.page.goto("/admin/configuracoes");
      await admin.page.getByLabel("Aviso no topo do site (opcional)").fill("");
      await admin.page.getByLabel("Cadastros abertos").check();
      await admin.page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(admin.page.getByText("Configurações salvas.")).toBeVisible();
    }
    await visitor.page.goto("/cadastro");
    await expect(visitor.page.getByRole("button", { name: "Criar conta" })).toBeVisible();
    await admin.context.close();
    await visitor.context.close();
  });
});

test("painel sem violações de acessibilidade", async ({ page }) => {
  await signIn(page, ADMIN);
  const violations: string[] = [];
  for (const path of [
    "/admin",
    "/admin/denuncias",
    "/admin/usuarios",
    "/admin/professores",
    "/admin/academias",
    "/admin/eventos",
    "/admin/modalidades",
    "/admin/historico",
    "/admin/configuracoes",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    violations.push(...results.violations.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
  }
  expect(violations).toEqual([]);
});
