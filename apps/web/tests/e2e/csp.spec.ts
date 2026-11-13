import { expect, test } from "@playwright/test";
import { DEMO, signInViaUi } from "./helpers";

// SECURITY.md §4: CSP com nonce por requisição. Nenhum script inline sem nonce e nenhuma violação nas páginas.
test.describe("Content Security Policy", () => {
  test.skip(({ isMobile }) => isMobile, "não depende de viewport");

  test("nonce novo a cada requisição, sem 'unsafe-inline' em scripts", async ({ request }) => {
    const a = (await request.get("/entrar")).headers()["content-security-policy"] ?? "";
    const b = (await request.get("/entrar")).headers()["content-security-policy"] ?? "";
    const nonceA = /'nonce-([^']+)'/.exec(a)?.[1];
    const nonceB = /'nonce-([^']+)'/.exec(b)?.[1];
    expect(nonceA).toBeTruthy();
    expect(nonceA).not.toBe(nonceB);
    const scriptSrc = a.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(a).toContain("frame-ancestors 'none'");
    expect(a).toContain("object-src 'none'");
  });

  test("páginas principais carregam sem violar a CSP", async ({ page, context }) => {
    await context.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204, body: "" }));
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy|Refused to (execute|load)/i.test(msg.text())) violations.push(`${page.url()}: ${msg.text()}`);
    });
    page.on("pageerror", (err) => violations.push(`${page.url()}: ${err.message}`));

    await page.goto("/");
    await page.goto("/academias/tatame-central");
    await page.waitForLoadState("networkidle");
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    for (const path of ["/inicio", "/publicar", "/jornada", "/eventos", "/notificacoes", "/aulas"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    // Hidratou de verdade (scripts com nonce rodaram): a navegação client-side funciona.
    await page.getByRole("navigation", { name: "Principal" }).filter({ visible: true }).getByRole("link", { name: "Explorar" }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    expect(violations).toEqual([]);
  });
});
