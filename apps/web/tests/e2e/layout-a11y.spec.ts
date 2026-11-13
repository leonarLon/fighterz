import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInViaUi } from "./helpers";

test.describe("navegação responsiva", () => {
  test("barra inferior no mobile, menu lateral no desktop", async ({ page, isMobile }) => {
    await signInViaUi(page, "demo@figtherz.local", "Figtherz123");
    await expect(page).toHaveURL(/\/inicio$/);
    const navs = page.getByRole("navigation", { name: "Principal" });
    // Só uma das duas navegações fica visível por vez.
    await expect(navs.filter({ visible: true })).toHaveCount(1);
    const visible = navs.filter({ visible: true });
    if (isMobile) {
      await expect(visible).toHaveClass(/bottom-0/);
    } else {
      await expect(visible).toHaveClass(/left-0/);
      await expect(visible.getByRole("link", { name: "Configurações" })).toBeVisible();
    }
    await expect(visible.getByRole("link", { name: "Publicar" })).toBeVisible();
    await expect(visible.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("acessibilidade (WCAG 2.1 AA)", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const path of ["/", "/entrar", "/cadastro", "/recuperar-senha", "/u/demo"]) {
      test(`${path} sem violações (${theme})`, async ({ page, context }) => {
        await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }

  test("área logada sem violações", async ({ page }) => {
    await signInViaUi(page, "demo@figtherz.local", "Figtherz123");
    for (const path of ["/inicio", "/explorar", "/explorar?q=bruna", "/publicar", "/notificacoes", "/salvos", "/u/atleta1", "/perfil", "/configuracoes"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
    }
  });
});

test("página de post (com comentários) sem violações", async ({ page }) => {
  await page.goto("/u/atleta1");
  await page.locator("main article").first().getByRole("link", { name: /Comentários/ }).click();
  await expect(page).toHaveURL(/\/p\//);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
