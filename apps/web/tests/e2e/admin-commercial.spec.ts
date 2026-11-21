import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { DEMO, createConfirmedUser, signInViaUi } from "./helpers";

// Fase 8: páginas comerciais no painel (denúncia, suspensão, selo), números e histórico.

async function as(browser: Browser, email: string) {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  await signInViaUi(page, email, "Figtherz123");
  await expect(page).toHaveURL(/\/inicio$/);
  return { context, page };
}

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("painel administrativo: comercial", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("denúncia de página → suspensão pela moderação → reativação; selo pelo admin", async ({ browser }) => {
    test.setTimeout(120_000);
    // Página nova (as de demonstração ficam intactas para os outros testes).
    const ownerCtx = await browser.newContext({ locale: "pt-BR" });
    const owner = await ownerCtx.newPage();
    await createConfirmedUser(owner, "pagina");
    const name = `Loja Suspeita ${Date.now().toString(36)}`;
    await owner.goto("/paginas/nova");
    await owner.getByLabel("Nome da página").fill(name);
    await owner.getByLabel("Serviço").check();
    await owner.getByRole("button", { name: "Criar página" }).click();
    await expect(owner).toHaveURL(/\/gerenciar$/);
    const publicUrl = owner.url().replace("/gerenciar", "");

    // Denúncia pela interface.
    const reporter = await as(browser, DEMO.email);
    await reporter.page.goto(publicUrl);
    await reporter.page.getByRole("button", { name: "Denunciar" }).click();
    const dialog = reporter.page.getByRole("dialog");
    await dialog.getByLabel("Spam ou golpe").check();
    await dialog.getByRole("button", { name: "Enviar denúncia" }).click();
    await expect(dialog.getByRole("status")).toContainText("Denúncia enviada");

    // Moderação suspende pela fila de denúncias.
    const mod = await as(browser, "moderador@figtherz.local");
    await mod.page.goto("/admin/denuncias");
    const item = mod.page.locator("main article").filter({ hasText: name });
    await expect(item).toContainText("Página comercial");
    await item.getByLabel("Motivo da decisão").fill("Golpe confirmado");
    await item.getByRole("button", { name: "Suspender página" }).click();
    await expect(item.getByRole("status")).toContainText("denúncias resolvidas");

    expect((await reporter.page.goto(publicUrl))?.status()).toBe(404);
    await owner.goto(`${publicUrl}/gerenciar`);
    await expect(owner.getByText("A página foi suspensa pela moderação.")).toBeVisible();
    await expect(owner.getByRole("button", { name: "Publicar página" })).toHaveCount(0);

    // Reativação em Páginas.
    await mod.page.goto(`/admin/paginas?q=${encodeURIComponent(name)}`);
    const row = mod.page.locator("main li").filter({ hasText: name });
    await expect(row).toContainText("Suspensa");
    await row.getByLabel("Motivo").fill("Revisado: dono regularizou");
    await row.getByRole("button", { name: "Restaurar" }).click();
    await expect(row.getByRole("button", { name: "Suspender página" })).toBeVisible();
    await expect(reporter.page.goto(publicUrl).then((r) => r?.status())).resolves.toBe(200);
    // Moderador não dá selo.
    await expect(row.getByRole("button", { name: "Marcar como verificada" })).toHaveCount(0);
    await expectNoAxeViolations(mod.page);

    // Admin dá o selo; aparece na página pública.
    const admin = await as(browser, "admin@figtherz.local");
    await admin.page.goto(`/admin/paginas?q=${encodeURIComponent(name)}`);
    await admin.page.locator("main li").filter({ hasText: name }).getByRole("button", { name: "Marcar como verificada" }).click();
    await expect(admin.page.getByText("Página verificada.")).toBeVisible();
    await reporter.page.goto(publicUrl);
    await expect(reporter.page.getByLabel("Página verificada")).toBeVisible();

    // Histórico de moderação registra suspensão, reativação e selo.
    await admin.page.goto("/admin/historico");
    await expect(admin.page.getByText("Golpe confirmado").first()).toBeVisible();
    await expect(admin.page.getByText("Deu selo de verificada").first()).toBeVisible();

    for (const c of [ownerCtx, reporter.context, mod.context, admin.context]) await c.close();
  });

  test("visão geral mostra números comerciais e a auditoria traduz planos", async ({ browser }) => {
    const admin = await as(browser, "admin@figtherz.local");
    await admin.page.goto("/admin");
    await expect(admin.page.getByText("Publicidade em perfis pessoais (revisões e recursos)")).toBeVisible();
    await expect(admin.page.getByText("Páginas comerciais")).toBeVisible();
    await expect(admin.page.getByText("Assinaturas ativas")).toBeVisible();
    const nav = admin.page.getByRole("navigation", { name: "Administração" });
    for (const label of ["Publicidade", "Páginas", "Planos", "Assinaturas"]) {
      await expect(nav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await expectNoAxeViolations(admin.page);
    await admin.context.close();

    // Moderador não vê Planos nem Assinaturas.
    const mod = await as(browser, "moderador@figtherz.local");
    await mod.page.goto("/admin");
    const modNav = mod.page.getByRole("navigation", { name: "Administração" });
    await expect(modNav.getByRole("link", { name: /^Publicidade/ })).toBeVisible();
    await expect(modNav.getByRole("link", { name: "Planos" })).toHaveCount(0);
    expect((await mod.page.goto("/admin/assinaturas"))?.status()).toBe(404);
    await mod.context.close();
  });
});
