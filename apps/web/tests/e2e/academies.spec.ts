import { test as base, expect, type Browser, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createConfirmedUser, localEnv, signInViaUi } from "./helpers";

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

test.describe("academias e aulas (visitante, sem login)", () => {
  test("página da academia: grade, unidades, mapa e rota", async ({ page }) => {
    await page.goto("/academias/tatame-central");
    await expect(page.getByRole("heading", { level: 1, name: "Tatame Central" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grade de aulas" })).toBeVisible();
    await expect(page.getByText("Jiu-Jitsu Iniciante").first()).toBeVisible();
    await expect(page.getByText("Aceita aula experimental").first()).toBeVisible();
    await expect(page.getByRole("region", { name: /Mapa das unidades/ })).toBeVisible();
    await expect(page.getByText("Rua das Flores, 120 - Centro - Curitiba/PR - CEP 80020-000")).toBeVisible();
    const route = page.getByRole("link", { name: "Abrir rota" }).first();
    await expect(route).toHaveAttribute("href", /openstreetmap\.org\/directions\?to=-25\.431,-49\.271|geo:|maps\.apple\.com/);
    await expect(page.getByRole("region", { name: "Professores" }).getByRole("link", { name: /Diego Ramos/ })).toBeVisible();
  });

  test("professor com 3 academias tem grade unificada pública", async ({ page }) => {
    await page.goto("/professores/atleta2");
    await expect(page.getByRole("heading", { name: "Professor Diego Ramos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grade unificada" })).toBeVisible();
    await expect(page.getByText(/Aulas em 3 academias/)).toBeVisible();
    for (const name of ["Tatame Central", "Equipe Raiz Combate", "Dojo Horizonte"]) {
      await expect(page.getByRole("link", { name }).first()).toBeVisible();
    }
    // Contato aparece porque o professor consentiu (show_contact)
    await expect(page.getByText("diego.ramos@figtherz.local")).toBeVisible();
  });

  test("busca de aulas por filtros, cidade e distância", async ({ page, context }) => {
    await page.goto("/aulas");
    await page.getByLabel("Modalidade").selectOption({ label: "Muay Thai" });
    await page.getByLabel("Só aulas que aceitam aula experimental").check();
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(page).toHaveURL(/experimental=1/);
    const results = page.locator("#resultados ~ ul > li");
    await expect(results.first()).toBeVisible();
    for (const text of await results.allInnerTexts()) expect(text).toContain("Muay Thai");

    await page.goto("/aulas?cidade=rio+de+janeiro");
    await expect(page.getByRole("link", { name: "Arena Norte Muay Thai" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tatame Central" })).toHaveCount(0);

    // "Perto de mim": a posição vai só na consulta
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: -25.4284, longitude: -49.2733 });
    await page.goto("/aulas");
    await page.getByRole("button", { name: "Perto de mim" }).click();
    await expect(page).toHaveURL(/lat=-25\.4284&lng=-49\.2733/);
    await expect(page.locator("#resultados ~ ul > li").first()).toContainText("km");
    await expect(page.locator("#resultados ~ ul > li").first()).toContainText("Curitiba");
    await expect(page.getByRole("link", { name: "Dojo Horizonte" })).toHaveCount(0);
  });
});

test.describe("gestão de academia e vínculos", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("cadastrar academia, unidade e aula; convidar professor que aceita", async ({ browser }) => {
    const owner = await newContext(browser);
    await createConfirmedUser(owner.page, "dono");
    const name = `Academia E2E ${Date.now().toString(36)}`;

    await owner.page.goto("/academias/nova");
    await owner.page.getByLabel("Nome da academia").fill(name);
    await owner.page.getByLabel("Jiu-Jitsu Brasileiro").check();
    await owner.page.getByRole("button", { name: "Cadastrar academia" }).click();
    await expect(owner.page).toHaveURL(/\/academias\/academia-e2e-[a-z0-9]+\/gerenciar$/);
    const slug = owner.page.url().split("/").at(-2)!;

    // Unidade com pino pelos campos de coordenadas (alternativa acessível ao mapa)
    const unitForm = owner.page.locator("form", { has: owner.page.getByRole("button", { name: "Adicionar unidade" }) });
    await unitForm.getByLabel("Nome da unidade").fill("Sede");
    await unitForm.getByLabel("Rua").fill("Rua Teste");
    await unitForm.getByLabel("Número").fill("10");
    await unitForm.getByLabel("Bairro").fill("Centro");
    await unitForm.getByLabel("Cidade").fill("Curitiba");
    await unitForm.getByLabel("Estado").selectOption("PR");
    await unitForm.getByLabel("Latitude").fill("-25.43");
    await unitForm.getByLabel("Longitude").fill("-49.27");
    await unitForm.getByRole("button", { name: "Adicionar unidade" }).click();
    await expect(owner.page.getByText("Rua Teste, 10 - Centro - Curitiba/PR")).toBeVisible();

    await owner.page.getByRole("button", { name: "Nova aula" }).click();
    const classForm = owner.page.locator("form", { has: owner.page.getByRole("button", { name: "Adicionar aula" }) });
    await classForm.getByLabel("Nome da aula").fill("Fundamentos E2E");
    await classForm.getByLabel("Dia").selectOption({ label: "Quarta" });
    await classForm.getByLabel("Início").fill("18:30");
    await classForm.getByLabel("Fim").fill("19:30");
    await classForm.getByLabel("Aceita aula experimental").check();
    await classForm.getByRole("button", { name: "Adicionar aula" }).click();
    await expect(owner.page.getByText(/Qua 18:30–19:30 · Fundamentos E2E/)).toBeVisible();

    // Convidar professor aprovado (atleta6, do seed)
    await owner.page.getByLabel("Usuário").fill("@atleta6");
    await owner.page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(owner.page.getByText("Convite enviado para @atleta6.")).toBeVisible();

    const teacher = await newContext(browser);
    await signInViaUi(teacher.page, "atleta6@figtherz.local", "Figtherz123");
    await expect(teacher.page).toHaveURL(/\/inicio$/);
    await teacher.page.goto("/professor");
    const row = teacher.page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toContainText("convite da academia");
    await row.getByRole("button", { name: "Aceitar convite" }).click();
    await expect(teacher.page.getByRole("listitem").filter({ hasText: name })).toContainText("vínculo ativo");

    // Visitante vê a grade e o professor na página pública
    const visitor = await newContext(browser);
    await visitor.page.goto(`/academias/${slug}`);
    await expect(visitor.page.getByText("Fundamentos E2E")).toBeVisible();
    await expect(visitor.page.getByRole("link", { name: "Igor Mendes" })).toBeVisible();

    await Promise.all([owner.context.close(), teacher.context.close(), visitor.context.close()]);
  });

  test("pedido de professor e aprovação pelo admin", async ({ browser }) => {
    const candidate = await newContext(browser);
    await createConfirmedUser(candidate.page, "cand");
    const professionalName = `Professor E2E ${Date.now().toString(36)}`;
    await candidate.page.goto("/professor");
    await candidate.page.getByLabel("Nome profissional").fill(professionalName);
    await candidate.page.getByLabel("Muay Thai").check();
    await candidate.page.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(candidate.page.getByText("Pedido enviado!")).toBeVisible();
    await candidate.page.reload();
    await expect(candidate.page.getByText("Pedido em análise por um administrador.")).toBeVisible();

    // Usuário comum não acessa a fila
    await candidate.page.goto("/admin/professores");
    await expect(candidate.page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();

    const admin = await newContext(browser);
    await signInViaUi(admin.page, "admin@figtherz.local", "Figtherz123");
    await expect(admin.page).toHaveURL(/\/inicio$/);
    await admin.page.goto("/admin/professores");
    const card = admin.page.locator("li", { has: admin.page.getByRole("heading", { name: professionalName }) });
    await card.getByRole("button", { name: "Aprovar" }).click();
    await expect(card.getByRole("status")).toHaveText("Aprovado.");

    await candidate.page.goto("/professor");
    await expect(candidate.page.getByText("Perfil profissional aprovado.")).toBeVisible();
    await Promise.all([candidate.context.close(), admin.context.close()]);
  });

  test("aluno pede vínculo e a academia aprova", async ({ browser }) => {
    const student = await newContext(browser);
    const user = await createConfirmedUser(student.page, "aluno");
    await student.page.goto("/academias/equipe-raiz-combate");
    await student.page.getByRole("button", { name: "Treino aqui" }).click();
    await expect(student.page.getByText("Pedido enviado. A academia precisa aprovar.")).toBeVisible();

    const owner = await newContext(browser);
    await signInViaUi(owner.page, "atleta3@figtherz.local", "Figtherz123");
    await expect(owner.page).toHaveURL(/\/inicio$/);
    await owner.page.goto("/academias/equipe-raiz-combate/gerenciar");
    const request = owner.page.getByRole("listitem").filter({ hasText: `@${user.username}` });
    await request.getByRole("button", { name: "Aprovar" }).click();
    await expect(owner.page.getByRole("listitem").filter({ hasText: `@${user.username} · Aluno` }).getByRole("button", { name: /Remover/ })).toBeVisible();

    await student.page.reload();
    await expect(student.page.getByRole("button", { name: "Sou aluno · sair" })).toBeVisible();
    await Promise.all([student.context.close(), owner.context.close()]);
  });
});

test.describe("API direta: academias respeitam a RLS", () => {
  test.skip(({ isMobile }) => isMobile, "não depende de viewport");

  test("quem não gerencia não altera grade, unidade nem vínculos", async ({ request }) => {
    const env = localEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: "demo@figtherz.local", password: "Figtherz123" });
    const { data: academy } = await client.from("academies").select("id").eq("slug", "tatame-central").single();
    const { data: unit } = await client.from("academy_units").select("id").eq("academy_id", academy!.id).limit(1).single();
    const { data: art } = await client.from("martial_arts").select("id").eq("slug", "jiu-jitsu").single();

    const insertClass = await client.from("class_schedules").insert({
      academy_id: academy!.id, unit_id: unit!.id, martial_art_id: art!.id, name: "Invasão", weekday: 1, starts_at: "05:00", ends_at: "06:00",
    });
    expect(insertClass.error?.code).toBe("42501");
    const editUnit = await client.from("academy_units").update({ name: "Invadida" }).eq("id", unit!.id).select();
    expect(editUnit.data).toEqual([]);
    const invite = await client.rpc("invite_member", { p_academy: academy!.id, p_username: "atleta5", p_role: "admin" });
    expect(invite.error?.message).toBe("forbidden");
    const selfPromote = await client.from("academy_memberships").insert({ academy_id: academy!.id, user_id: (await client.auth.getUser()).data.user!.id, role: "owner", status: "active", requested_by: "user" });
    expect(selfPromote.error?.code).toBe("42501");

    // Visitante não vê a lista de alunos
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const students = await anon.from("academy_memberships").select("user_id").eq("academy_id", academy!.id).eq("role", "student");
    expect(students.data).toEqual([]);

    // Proxy de geocodificação exige login (não vira proxy aberto para serviços públicos)
    const geo = await request.get("/api/geo/cep?cep=80020000");
    expect(geo.status()).toBe(401);
  });
});
