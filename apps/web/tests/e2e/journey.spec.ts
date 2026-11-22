import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createConfirmedUser, DEMO, signInViaUi, signOutViaUi } from "./helpers";

// Testes automatizados não buscam tiles do OpenStreetMap (política de uso dos tiles do OSM).
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

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

/** "AAAA-MM-DDTHH:mm" no horário de Brasília, daqui a `days` dias. */
function localDateTime(days: number, hour: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const day = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return `${day}T${String(hour).padStart(2, "0")}:00`;
}

test.describe("eventos (visitante)", () => {
  test("lista só publicados e pede login para marcar interesse", async ({ page }) => {
    await page.goto("/eventos");
    await expect(page.getByRole("heading", { level: 1, name: "Eventos" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open mat de sábado/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Seminário de guarda com Diego Ramos/ })).toBeVisible();
    await expect(page.getByText("Workshop de arbitragem (rascunho)")).toHaveCount(0);

    await page.getByRole("link", { name: /Seminário de guarda com Diego Ramos/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Seminário de guarda com Diego Ramos" })).toBeVisible();
    await expect(page.getByText(/pessoas interessadas/)).toBeVisible();
    await expect(page.getByText("Ginásio Fictício")).toBeVisible();
    await page.getByRole("button", { name: "Tenho interesse" }).click();
    await expect(page).toHaveURL(/\/entrar\?next=%2Feventos%2F/);
  });

  test("filtro por estado", async ({ page }) => {
    await page.goto("/eventos?uf=SP");
    await expect(page.getByRole("link", { name: /Campeonato Paulista Fictício/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open mat de sábado/ })).toHaveCount(0);
  });

  test("perfil público mostra a jornada", async ({ page }) => {
    await page.goto("/u/demo");
    await expect(page.getByRole("heading", { name: "Jornada" })).toBeVisible();
    await expect(page.getByText("Faixa Azul · 3 graus")).toBeVisible();
    await expect(page.getByText("Campeã da categoria")).toBeVisible();
    // Treinos da demo são "só seguidores" (padrão): visitante não vê.
    await expect(page.getByText("Treinos registrados")).toHaveCount(0);
  });
});

test.describe("jornada", () => {
  test("registrar treino e compartilhar: aparece como “registrou um treino”", async ({ page }) => {
    await createConfirmedUser(page, "treino");
    await page.goto("/jornada/treino");
    await page.getByLabel("Modalidade", { exact: true }).selectOption({ label: "Jiu-Jitsu Brasileiro" });
    await page.getByLabel("Duração em minutos (opcional)").fill("75");
    await page.getByLabel("Como foi? (opcional)").fill("Drills de raspagem");
    await page.getByLabel("Compartilhar no feed").check();
    await page.getByLabel("Quem vê o post").selectOption("public");
    await page.getByRole("button", { name: "Registrar treino" }).click();

    await expect(page).toHaveURL(/\/jornada\?treino=registrado/);
    await expect(page.getByText("Treino registrado.")).toBeVisible();
    await expect(page.getByText("Registrou um treino de Jiu-Jitsu Brasileiro")).toBeVisible();
    await expect(page.getByRole("heading", { name: / · 1 treino$/ })).toBeVisible();

    await page.goto("/inicio");
    const post = page.locator("main article").first();
    await expect(post).toContainText("Registrou um treino de Jiu-Jitsu Brasileiro");
    await expect(post.getByText("Drills de raspagem")).toBeVisible();
    // Nunca "esteve em"
    await expect(page.getByText(/esteve em/i)).toHaveCount(0);
  });

  test("acessibilidade: jornada, treino, eventos e evento", async ({ page }) => {
    await signInViaUi(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/inicio$/);
    const violations: string[] = [];
    for (const path of ["/jornada", "/jornada/treino", "/eventos", "/eventos/novo"]) {
      await page.goto(path);
      violations.push(...(await axe(page)));
    }
    await page.goto("/eventos");
    await page.getByRole("link", { name: /Seminário de guarda/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    violations.push(...(await axe(page)));
    expect(violations).toEqual([]);
  });
});

test.describe("aceite da Fase 5: graduação BJJ com graus validados e confirmada pelo professor", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("aluno registra faixa azul com grau, professor confirma", async ({ browser }) => {
    const athlete = await newContext(browser);
    const user = await createConfirmedUser(athlete.page, "faixa");
    const p = athlete.page;

    // Desde a migration 30, só professor com vínculo ativo recebe o pedido: aluno pede, professor aceita.
    await p.goto("/professores/atleta2");
    await p.getByRole("button", { name: "Sou aluno de Professor Diego Ramos" }).click();
    await expect(p.getByText("Pedido enviado, aguardando o professor")).toBeVisible();
    const teacher = await newContext(browser);
    await signInViaUi(teacher.page, "atleta2@figtherz.local", "Figtherz123");
    await expect(teacher.page).toHaveURL(/\/inicio$/);
    await teacher.page.goto("/professor#alunos");
    await teacher.page.getByRole("listitem").filter({ hasText: `@${user.username}` }).getByRole("button", { name: "Aceitar" }).click();
    await expect(teacher.page.getByText("Vínculo aceito.")).toBeVisible();

    await p.goto("/jornada");
    await p.getByLabel("Modalidade", { exact: true }).selectOption({ label: "Jiu-Jitsu Brasileiro" });
    await p.getByRole("button", { name: "Adicionar modalidade" }).click();
    await expect(p.getByRole("heading", { level: 3, name: "Jiu-Jitsu Brasileiro" })).toBeVisible();

    await p.getByText("Registrar graduação em Jiu-Jitsu Brasileiro").click();
    const form = p.locator("form", { has: p.getByRole("button", { name: "Registrar graduação" }) });
    const degree = form.getByLabel("Graus");
    await expect(degree).toBeDisabled();

    // Faixa azul: 0 a 4 graus. Coral: nenhum grau.
    await form.getByLabel("Graduação", { exact: true }).selectOption({ label: "Faixa Coral (vermelha e preta)" });
    await expect(degree.locator("option")).toHaveCount(1);
    await form.getByLabel("Graduação", { exact: true }).selectOption({ label: "Faixa Azul" });
    await expect(degree.locator("option")).toHaveCount(5);
    await expect(form.getByText("De 0 a 4.")).toBeVisible();

    await degree.selectOption("2");
    await form.getByLabel("Data da graduação").fill("2025-03-15");
    await form.getByLabel("Professor que graduou (opcional)").selectOption({ label: "Professor Diego Ramos (@atleta2)" });
    await form.getByRole("button", { name: "Registrar graduação" }).click();
    await expect(p.getByText(/^Graduação registrada\. Graduação atual em Jiu-Jitsu Brasileiro: Faixa Azul · 2 graus\. O professor vai receber o pedido de confirmação\.$/)).toBeVisible();
    await expect(p.getByText("Faixa Azul · 2 graus").first()).toBeVisible();
    await expect(p.getByText(/aguardando @atleta2/)).toBeVisible();

    await teacher.page.goto("/professor");
    const request = teacher.page
      .getByRole("region", { name: "Graduações para confirmar" })
      .getByRole("listitem")
      .filter({ hasText: `@${user.username}` });
    await expect(request).toContainText("Faixa Azul · 2 graus");
    await request.getByRole("button", { name: "Confirmar" }).click();
    await expect(request.getByRole("status")).toHaveText("Graduação confirmada.");

    await p.reload();
    await expect(p.getByText("Confirmada pelo professor").first()).toBeVisible();
    await expect(p.getByText(/confirmada por @atleta2/)).toBeVisible();

    await athlete.context.close();
    await teacher.context.close();
  });

  test("academia cria evento, aluno marca interesse e é avisado do cancelamento", async ({ browser }) => {
    const owner = await newContext(browser);
    await createConfirmedUser(owner.page, "evento");
    const o = owner.page;
    await o.goto("/academias/nova");
    await o.getByLabel("Nome da academia").fill(`Academia Eventos ${Date.now().toString(36)}`);
    await o.getByLabel("Jiu-Jitsu Brasileiro").check();
    await o.getByRole("button", { name: "Cadastrar academia" }).click();
    await expect(o).toHaveURL(/\/gerenciar$/);

    const title = `Open mat E2E ${Date.now().toString(36)}`;
    await o.goto("/eventos/novo");
    await o.getByLabel("Título").fill(title);
    await o.getByLabel("Tipo").selectOption({ label: "Open mat" });
    await o.getByLabel("Início").fill(localDateTime(7, 10));
    await o.getByLabel("Fim").fill(localDateTime(7, 12));
    await o.getByLabel("Cidade").fill("Curitiba");
    await o.getByLabel("Estado").selectOption("PR");
    await o.getByRole("button", { name: "Criar evento" }).click();
    await expect(o.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const eventUrl = o.url();

    const fan = await newContext(browser);
    await signInViaUi(fan.page, DEMO.email, DEMO.password);
    await expect(fan.page).toHaveURL(/\/inicio$/);
    await fan.page.goto(eventUrl);
    await fan.page.getByRole("button", { name: "Tenho interesse" }).click();
    await expect(fan.page.getByText("Interesse registrado. Avisaremos se o evento mudar.")).toBeVisible();
    await expect(fan.page.getByRole("button", { name: "Tenho interesse" })).toHaveAttribute("aria-pressed", "true");

    o.once("dialog", (d) => d.accept());
    await o.reload();
    await o.getByRole("button", { name: "Cancelar evento" }).click();
    await expect(o.getByText("Evento cancelado.", { exact: true })).toBeVisible();

    await fan.page.goto("/notificacoes");
    await expect(fan.page.getByText(new RegExp(`cancelou um evento que você marcou interesse.*${title}`))).toBeVisible();

    await owner.context.close();
    await fan.context.close();
  });
});

// Regressão do bug de graduação (21/11/2026): faixa maior com data anterior não virava a atual.
test("graduação: faixa maior com data antiga vira a atual, corrigir funciona e persiste após sair e entrar", async ({ page }) => {
  const user = await createConfirmedUser(page, "graduacao");
  await page.goto("/jornada");
  await page.getByLabel("Modalidade", { exact: true }).selectOption({ label: "Jiu-Jitsu Brasileiro" });
  await page.getByRole("button", { name: "Adicionar modalidade" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Jiu-Jitsu Brasileiro" })).toBeVisible();

  async function register(rank: string, degree: string, date: string) {
    const details = page.locator("details", { has: page.getByText("Registrar graduação em Jiu-Jitsu Brasileiro") });
    if (!(await details.evaluate((d: HTMLDetailsElement) => d.open))) await details.locator("summary").click();
    const form = details.locator("form");
    await form.getByLabel("Graduação", { exact: true }).selectOption({ label: rank });
    await form.getByLabel("Graus").selectOption(degree);
    await form.getByLabel("Data da graduação").fill(date);
    await form.getByRole("button", { name: "Registrar graduação" }).click();
  }

  await register("Faixa Azul", "2", "2026-10-01");
  await expect(page.getByText(/Graduação atual em Jiu-Jitsu Brasileiro: Faixa Azul · 2 graus\./)).toBeVisible();

  // O caso do bug: roxa com data ANTERIOR à azul.
  await register("Faixa Roxa", "0", "2025-01-10");
  await expect(page.getByText(/Graduação atual em Jiu-Jitsu Brasileiro: Faixa Roxa\./)).toBeVisible();
  await page.reload();
  const current = page.getByText("Graduação atual (a maior registrada)").locator("..");
  await expect(current).toContainText("Faixa Roxa");

  // Corrigir o registro da roxa para marrom 1 grau.
  await page.locator("summary", { hasText: "Corrigir Faixa Roxa de" }).click();
  const edit = page.locator("form", { has: page.getByRole("button", { name: "Salvar correção" }) });
  await edit.getByLabel("Graduação", { exact: true }).selectOption({ label: "Faixa Marrom" });
  await edit.getByLabel("Graus").selectOption("1");
  await edit.getByRole("button", { name: "Salvar correção" }).click();
  await expect(page.getByText(/Graduação corrigida\. Graduação atual em Jiu-Jitsu Brasileiro: Faixa Marrom · 1 grau\./)).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // Persiste após recarregar, sair e entrar, e aparece no perfil.
  await page.reload();
  await expect(page.getByText("Graduação atual (a maior registrada)").locator("..")).toContainText("Faixa Marrom · 1 grau");
  await signOutViaUi(page);
  await signInViaUi(page, user.email, user.password);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/jornada");
  await expect(page.getByText("Graduação atual (a maior registrada)").locator("..")).toContainText("Faixa Marrom · 1 grau");
  await page.goto(`/u/${user.username}`);
  await expect(page.locator("main")).toContainText("Faixa Marrom · 1 grau");
});
