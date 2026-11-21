import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DEMO, createConfirmedUser, localEnv, signInViaUi } from "./helpers";

// Fase 6 da evolução comercial: planos e assinaturas pelo admin, benefício conferido no banco, professores gratuitos.

async function login(browser: Browser, email: string) {
  const context = await browser.newContext({ locale: "pt-BR" });
  await context.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204, body: "" }));
  const page = await context.newPage();
  await signInViaUi(page, email, "Figtherz123");
  await expect(page).toHaveURL(/\/inicio$/);
  return { context, page };
}

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

function planCard(page: Page) {
  return page.locator("div.rounded-lg", { has: page.locator("h2#plano") });
}

test.describe("planos e assinaturas", () => {
  test("admin cria plano, associa, suspende, reativa e cancela; dono acompanha", async ({ browser, isMobile }) => {
    test.skip(isMobile, "painel administrativo roda no desktop");
    test.setTimeout(120_000);
    // Academia nova a cada execução (a assinatura aberta é única por academia).
    const ownerContext = await browser.newContext({ locale: "pt-BR" });
    await ownerContext.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204, body: "" }));
    const owner = { context: ownerContext, page: await ownerContext.newPage() };
    await createConfirmedUser(owner.page, "plano");
    const academyName = `Academia Plano ${Date.now().toString(36)}`;
    await owner.page.goto("/academias/nova");
    await owner.page.getByLabel("Nome da academia").fill(academyName);
    await owner.page.getByLabel("Muay Thai").check();
    await owner.page.getByRole("button", { name: "Cadastrar academia" }).click();
    await expect(owner.page).toHaveURL(/\/academias\/[a-z0-9-]+\/gerenciar$/);
    const academySlug = owner.page.url().split("/academias/")[1]!.replace("/gerenciar", "");
    const manageUrl = owner.page.url();

    const admin = await login(browser, "admin@figtherz.local");
    const slug = `e2e-${Date.now().toString(36)}`;
    const name = `Plano E2E ${slug.slice(4)}`;

    // Plano novo com galeria 25.
    await admin.page.goto("/admin/planos");
    const form = admin.page.getByRole("form", { name: "Novo plano" });
    await form.getByLabel("Nome").fill(name);
    await form.getByLabel("Endereço (slug)").fill(slug);
    await form.getByLabel("Preço de referência (opcional)").fill("R$ 10/mês");
    await form.getByLabel("Para quem").selectOption("academy");
    await form.getByLabel("Fotos na galeria da academia").fill("-3");
    await form.getByRole("button", { name: "Criar plano" }).click();
    await expect(form.getByText("Use um número inteiro de 0 a 10000.")).toBeVisible();
    await form.getByLabel("Fotos na galeria da academia").fill("25");
    await form.getByRole("button", { name: "Criar plano" }).click();
    await expect(admin.page.getByRole("heading", { name, level: 2 })).toBeVisible();
    await expectNoAxeViolations(admin.page);

    // Associa à academia do atleta5.
    await admin.page.goto("/admin/assinaturas");
    const sub = admin.page.getByRole("form", { name: "Nova assinatura" });
    await sub.getByLabel("Endereço (slug)").fill(academySlug);
    await sub.getByLabel("Plano").selectOption({ label: `${name} (academias)` });
    await sub.getByRole("button", { name: "Criar assinatura" }).click();
    await expect(sub.getByText("Assinatura criada e ativa.")).toBeVisible();
    // Uma assinatura aberta por academia.
    await sub.getByLabel("Endereço (slug)").fill(academySlug);
    await sub.getByLabel("Plano").selectOption({ label: `${name} (academias)` });
    await sub.getByRole("button", { name: "Criar assinatura" }).click();
    await expect(sub.getByText("Já existe uma assinatura ativa ou suspensa")).toBeVisible();

    await owner.page.goto(manageUrl);
    await expect(planCard(owner.page).getByText(name, { exact: true }).first()).toBeVisible();
    await expect(planCard(owner.page).getByText("Fotos na galeria da academia: 25")).toBeVisible();
    await expect(owner.page.getByText(/de 25 fotos/)).toBeVisible();

    // Suspender exige motivo; suspensa volta ao limite padrão.
    await admin.page.reload();
    const group = admin.page.getByRole("group", { name: `Assinatura de ${academyName}` }).first();
    await group.locator("summary", { hasText: "Gerenciar assinatura" }).click();
    await group.getByRole("button", { name: "Suspender" }).click();
    await expect(group.getByText("Informe o motivo (mínimo 3 caracteres).")).toBeVisible();
    await group.getByLabel(/Motivo/).fill("Teste de suspensão");
    await group.getByRole("button", { name: "Suspender" }).click();
    await expect(group.getByText("Assinatura suspensa.")).toBeVisible();
    await owner.page.reload();
    await expect(planCard(owner.page).getByText("Assinatura suspensa pela equipe")).toBeVisible();
    await expect(owner.page.getByText(/de 12 fotos/)).toBeVisible();

    // Reativar e cancelar, com histórico.
    await admin.page.reload();
    const again = admin.page.getByRole("group", { name: `Assinatura de ${academyName}` }).first();
    await again.locator("summary", { hasText: "Gerenciar assinatura" }).click();
    await again.getByRole("button", { name: "Reativar" }).click();
    await expect(again.getByText("Assinatura reativada.")).toBeVisible();
    await admin.page.reload();
    const last = admin.page.getByRole("group", { name: `Assinatura de ${academyName}` }).first();
    await last.locator("summary", { hasText: "Gerenciar assinatura" }).click();
    await last.getByLabel(/Motivo/).fill("Fim do teste E2E");
    await last.getByRole("button", { name: "Cancelar assinatura" }).click();
    await expect(last.getByText("Assinatura cancelada.")).toBeVisible();
    await admin.page.reload();
    const done = admin.page.getByRole("group", { name: `Assinatura de ${academyName}` }).first();
    await done.locator("summary", { hasText: "Histórico" }).click();
    await expect(done.getByText("Ativa → Suspensa")).toBeVisible();
    await expect(done.getByText("Suspensa → Ativa")).toBeVisible();
    await expect(done.getByText("Ativa → Cancelada")).toBeVisible();

    await owner.page.reload();
    await expect(planCard(owner.page).getByText("Sem plano")).toBeVisible();
    await Promise.all([admin.context.close(), owner.context.close()]);
  });

  test("destaque do plano aparece sinalizado na lista", async ({ page }) => {
    await page.goto("/academias");
    const first = page.getByRole("main").getByRole("listitem").first();
    await expect(first).toContainText("Em destaque");
    await expect(first).toContainText("Tatame Central");
    await page.goto("/paginas");
    await expect(page.getByRole("link", { name: /Em destaque.*Kimonos Tatame Forte|Kimonos Tatame Forte.*Em destaque/ })).toBeVisible();
  });

  test("usuário comum não acessa o painel e não se dá plano pela API", async ({ page }) => {
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/admin/planos");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();

    const env = localEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password });
    const { data: plan } = await client.from("plans").select("id").eq("slug", "academia-destaque").single();
    const { data: academy } = await client.from("academies").select("id").eq("slug", "tatame-central").single();
    const create = await client.rpc("admin_create_subscription", { p_plan: plan!.id, p_academy: academy!.id });
    expect(create.error?.message).toBe("not_admin");
    const direct = await client.from("subscriptions").insert({ plan_id: plan!.id, academy_id: academy!.id });
    expect(direct.error?.code).toBe("42501");
    const feature = await client.from("plan_features").update({ value: 9999 }).eq("plan_id", plan!.id).select();
    expect(feature.data ?? []).toEqual([]);
    const subs = await client.from("subscriptions").select("id");
    expect(subs.data ?? []).toEqual([]);
  });

  test("professor continua gratuito: área do professor sem plano nem assinatura", async ({ page }) => {
    await signInViaUi(page, "atleta2@figtherz.local", "Figtherz123");
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/professor");
    await expect(page.getByText("Perfil profissional aprovado.")).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(/assinatura|plano pago/i);
    await page.goto("/professores/atleta2");
    await expect(page.getByRole("heading", { name: "Grade unificada" })).toBeVisible();
  });
});
