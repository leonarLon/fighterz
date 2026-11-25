import AxeBuilder from "@axe-core/playwright";
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
    await expect(page.getByRole("region", { name: "Professores", exact: true }).getByRole("link", { name: /Diego Ramos/ })).toBeVisible();
  });

  test("professor com 3 academias tem grade unificada pública", async ({ page }) => {
    await page.goto("/professores/atleta2");
    await expect(page.getByRole("heading", { name: "Professor Diego Ramos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grade unificada" })).toBeVisible();
    // 3 academias com vínculo (a grade própria dele também usa a Tatame Central, então continuam 3 locais).
    await expect(page.getByText(/Aulas em 3 locais/)).toBeVisible();
    for (const name of ["Tatame Central", "Equipe Raiz Combate", "Dojo Horizonte"]) {
      await expect(page.getByRole("link", { name }).first()).toBeVisible();
    }
    // Contato aparece porque o professor consentiu (show_contact)
    await expect(page.getByText("diego.ramos@figtherz.local")).toBeVisible();
    await expect(page.locator("p", { hasText: "Planos aceitos onde dá aula:" })).toContainText("TotalPass Silver e Gold");
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

  test("professor ativado pelo critério de faixa preta; admin revoga e reativa", async ({ browser }) => {
    const candidate = await newContext(browser);
    const candidateUser = await createConfirmedUser(candidate.page, "cand");
    const professionalName = `Professor E2E ${Date.now().toString(36)}`;

    // "Sou professor" fica no próprio perfil.
    await candidate.page.goto(`/u/${candidateUser.username}`);
    await candidate.page.getByRole("link", { name: "Sou professor" }).click();
    await expect(candidate.page).toHaveURL(/\/professor$/);

    await candidate.page.getByLabel("Nome profissional").fill(professionalName);
    await candidate.page.getByLabel("Muay Thai").check();
    await candidate.page.getByLabel("Planos aceitos onde dou aula (opcional)").fill("Arena Norte aceita TotalPass e Wellhub Gold");
    // Sem graduação numa modalidade com faixa: não ativa.
    await candidate.page.getByRole("button", { name: "Ativar perfil de professor" }).click();
    await expect(candidate.page.getByText("Nas modalidades com faixa, escolha sua graduação (faixa preta ou equivalente).")).toBeVisible();
    // Só aparecem graduações a partir do Kruang Preto.
    const rank = candidate.page.getByLabel("Sua graduação em Muay Thai (obrigatória)");
    await expect(rank.locator("option")).toHaveText(["Escolha sua graduação", "Kruang Preto"]);
    await rank.selectOption({ label: "Kruang Preto" });
    await candidate.page.getByRole("button", { name: "Ativar perfil de professor" }).click();
    await expect(candidate.page.getByText("Pronto! Seu perfil de professor já está ativo.")).toBeVisible();
    await candidate.page.reload();
    await expect(candidate.page.getByText("Perfil de professor ativo.")).toBeVisible();
    await expect(candidate.page.getByLabel("Planos aceitos onde dou aula (opcional)")).toHaveValue("Arena Norte aceita TotalPass e Wellhub Gold");

    // Usuário comum não acessa a lista do admin
    await candidate.page.goto("/admin/professores");
    await expect(candidate.page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();

    // Admin revoga (com motivo) e reativa.
    const admin = await newContext(browser);
    await signInViaUi(admin.page, "admin@figtherz.local", "Figtherz123");
    await expect(admin.page).toHaveURL(/\/inicio$/);
    await admin.page.goto(`/admin/professores?q=${encodeURIComponent(professionalName)}`);
    const card = admin.page.locator("li", { has: admin.page.getByRole("heading", { name: professionalName }) });
    await card.getByLabel("Motivo da revogação").fill("Teste automatizado de revogação");
    await card.getByRole("button", { name: `Revogar perfil de ${professionalName}` }).click();
    await expect(card.getByRole("status")).toHaveText("Perfil revogado.");
    await candidate.page.goto("/professor");
    await expect(candidate.page.getByText("Perfil profissional revogado pela equipe Fighterz.")).toBeVisible();
    await card.getByRole("button", { name: `Reativar perfil de ${professionalName}` }).click();
    await expect(card.getByRole("status")).toHaveText("Perfil reativado.");

    // Visitante vê os planos citados no perfil público do professor
    const visitor = await newContext(browser);
    await visitor.page.goto(`/professores/${candidateUser.username}`);
    await expect(visitor.page.locator("p", { hasText: "Planos aceitos onde dá aula:" })).toContainText("Arena Norte aceita TotalPass e Wellhub Gold");
    await Promise.all([candidate.context.close(), admin.context.close(), visitor.context.close()]);
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

test.describe("TotalPass, Wellhub e diária por unidade", () => {
  test("seed: cada unidade mostra as próprias regras para o visitante", async ({ page }) => {
    await page.goto("/academias/tatame-central");
    const centro = page.locator("li", { has: page.getByRole("heading", { name: "Sede Centro" }) });
    await expect(centro.getByText("Aceita TotalPass")).toBeVisible();
    await expect(centro.getByText("Silver, Gold").first()).toBeVisible();
    await expect(centro.getByText("Diária: R$ 40,00")).toBeVisible();
    const agua = page.locator("li", { has: page.getByRole("heading", { name: "Unidade Água Verde" }) });
    await expect(agua.getByText("Não aceita TotalPass")).toBeVisible();
    await expect(agua.getByText("Diária gratuita")).toBeVisible();
    await page.goto("/academias/equipe-raiz-combate");
    await expect(page.getByText("Diária: valor não divulgado")).toBeVisible();
  });

  test("dono informa, salva, recarrega e o público vê", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "fluxo de gestão roda no desktop");
    await signInViaUi(page, "atleta5@figtherz.local", "Figtherz123");
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/academias/arena-norte-muay-thai/gerenciar");
    await page.locator("summary", { hasText: "TotalPass, Wellhub e diária · Tijuca" }).click();

    const tp = page.getByRole("form", { name: "TotalPass na unidade Tijuca" });
    await tp.getByLabel("Aceita TotalPass nesta unidade").check();
    await tp.getByLabel("Planos aceitos (opcional)").fill("Silver, Gold");
    await tp.getByLabel("Muay Thai").check();
    await tp.getByLabel("Horários de acesso (opcional)").fill("Seg a sex, 7h às 21h");
    await tp.getByRole("button", { name: "Salvar TotalPass" }).click();
    await expect(tp.getByText("TotalPass salvo.")).toBeVisible();

    const wh = page.getByRole("form", { name: "Wellhub na unidade Tijuca" });
    await wh.getByLabel("Aceita Wellhub nesta unidade").uncheck();
    await wh.getByRole("button", { name: "Salvar Wellhub" }).click();
    await expect(wh.getByText("Wellhub salvo.")).toBeVisible();

    const dp = page.getByRole("form", { name: "Diária na unidade Tijuca" });
    await dp.getByLabel("Oferece diária nesta unidade").check();
    await dp.getByLabel("Paga").check();
    await dp.getByLabel("Valor (R$)").fill("");
    await dp.getByRole("button", { name: "Salvar Diária" }).click();
    await expect(dp.getByText("Informe o valor. Ex.: 40,00")).toBeVisible();
    await dp.getByLabel("Valor (R$)").fill("45,50");
    await dp.getByRole("button", { name: "Salvar Diária" }).click();
    await expect(dp.getByText("Diária salvo.")).toBeVisible();

    // Persistência: recarregar mantém os valores.
    await page.reload();
    await page.locator("summary", { hasText: "TotalPass, Wellhub e diária · Tijuca" }).click();
    await expect(page.getByRole("form", { name: "TotalPass na unidade Tijuca" }).getByLabel("Planos aceitos (opcional)")).toHaveValue("Silver, Gold");
    await expect(page.getByRole("form", { name: "Diária na unidade Tijuca" }).getByLabel("Valor (R$)")).toHaveValue("45,50");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

    // Visitante (sem login) vê na página pública.
    const visitor = await newContext(browser);
    await visitor.page.goto("/academias/arena-norte-muay-thai");
    const unit = visitor.page.locator("li", { has: visitor.page.getByRole("heading", { name: "Tijuca" }) });
    await expect(unit.getByText("Aceita TotalPass")).toBeVisible();
    await expect(unit.getByText("Silver, Gold")).toBeVisible();
    await expect(unit.getByText("Seg a sex, 7h às 21h")).toBeVisible();
    await expect(unit.getByText("Não aceita Wellhub")).toBeVisible();
    await expect(unit.getByText("Diária: R$ 45,50")).toBeVisible();
    await visitor.context.close();
  });

  test("API direta: quem não gerencia não escreve", async () => {
    const env = localEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: "demo@figtherz.local", password: "Figtherz123" });
    const { data: unit } = await client.from("academy_units").select("id").eq("name", "Sede Centro").single();
    const insert = await client.from("academy_unit_access").insert({ unit_id: unit!.id, academy_id: "00000000-0000-0000-0000-000000000000", kind: "wellhub", accepted: false });
    expect(insert.error?.code).toBe("42501");
    const update = await client.from("academy_unit_access").update({ price_cents: 1 }).eq("unit_id", unit!.id).select();
    expect(update.data ?? []).toEqual([]);
  });
});

test.describe("regressão: selects não voltam ao padrão após erro de validação", () => {
  test("aula nova mantém dia e nível escolhidos depois de corrigir o nome", async ({ page, isMobile }) => {
    test.skip(isMobile, "fluxo de gestão roda no desktop");
    await signInViaUi(page, "atleta5@figtherz.local", "Figtherz123");
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto("/academias/arena-norte-muay-thai/gerenciar");
    await page.getByRole("button", { name: "Nova aula" }).click();
    const classForm = page.locator("form", { has: page.getByRole("button", { name: "Adicionar aula" }) });
    await classForm.getByLabel("Dia").selectOption({ label: "Sexta" });
    await classForm.getByLabel("Nível").selectOption({ label: "Avançado" });
    await classForm.getByLabel("Início").fill("06:15");
    await classForm.getByLabel("Fim").fill("07:15");
    await classForm.getByRole("button", { name: "Adicionar aula" }).click();
    await expect(classForm.getByText("Dê um nome à aula.")).toBeVisible();
    await expect(classForm.getByLabel("Dia")).toHaveValue("5");
    const name = `Sparring ${Date.now().toString(36)}`;
    await classForm.getByLabel("Nome da aula").fill(name);
    await classForm.getByRole("button", { name: "Adicionar aula" }).click();
    await expect(page.getByText(new RegExp(`Sex 06:15–07:15 · ${name}`))).toBeVisible();
    await page.goto("/academias/arena-norte-muay-thai");
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
