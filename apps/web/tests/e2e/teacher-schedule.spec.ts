import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { signInViaUi } from "./helpers";

// Grade própria do professor: local livre e local em academia cadastrada (a academia confirma), aulas em vários
// dias, próxima aula no perfil, busca de aulas e Explorar.

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

test.describe("grade própria do professor", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("professor cadastra locais e aulas; academia confirma; aparece no perfil, na busca e no Explorar", async ({ browser }) => {
    test.setTimeout(120_000);
    const placeName = `Praça E2E ${Date.now().toString(36)}`;
    const teacher = await as(browser, "atleta14@figtherz.local"); // Sensei Rafael Teixeira (Karatê), Dojo Horizonte
    const t = teacher.page;
    await t.goto("/professor#minha-grade");

    // 1) Local livre (sem nenhum local, o formulário já vem aberto).
    const addPlace = t.getByRole("button", { name: "Adicionar local" });
    if (await addPlace.isVisible()) await addPlace.click();
    await t.getByLabel("Outro local (academia sem perfil, parque, clube…)").check();
    await t.getByLabel("Nome do local").fill(placeName);
    await t.getByLabel("Cidade").fill("Ourinhos");
    await t.getByLabel("Estado").selectOption("SP");
    await t.getByRole("button", { name: "Salvar local" }).click();
    await expect(t.getByText("Local salvo. Agora cadastre as aulas nesse local.")).toBeVisible();

    // 2) Local numa academia cadastrada em que ele ainda não tem vínculo (Tatame Central).
    await t.getByRole("button", { name: "Adicionar local" }).click();
    await t.getByLabel("Academia cadastrada no Fighterz").check();
    await t.getByLabel("Academia", { exact: true }).selectOption({ label: "Tatame Central · Curitiba" });
    await t.getByRole("button", { name: "Salvar local" }).click();
    await expect(t.getByText(/A academia recebeu seu pedido de professor/)).toBeVisible();
    const tatameRow = t.getByRole("listitem").filter({ hasText: "Tatame Central" }).first();
    await expect(tatameRow).toContainText("Aguardando a academia confirmar");

    // 3) Aula em dois dias de uma vez no local livre.
    await t.getByRole("button", { name: "Adicionar aula" }).click();
    await t.getByLabel("Local").selectOption({ label: placeName });
    await t.getByLabel("Segunda").check();
    await t.getByLabel("Quarta").check();
    await t.getByLabel("Início").fill("06:00");
    await t.getByLabel("Fim").fill("07:00");
    await t.getByRole("button", { name: "Adicionar à grade" }).click();
    await expect(t.getByText("2 aulas adicionadas à sua grade.")).toBeVisible();
    await expectNoAxeViolations(t);

    // 4) Perfil público do professor: próxima aula e o local na grade.
    const visitor = await browser.newContext({ locale: "pt-BR" });
    const v = await visitor.newPage();
    await v.goto("/professores/atleta14");
    await expect(v.getByRole("heading", { name: "Próxima aula" })).toBeVisible();
    await expect(v.getByRole("region", { name: "Grade unificada" })).toContainText(placeName);
    await v.goto("/u/atleta14");
    await expect(v.getByText("Próxima aula:")).toBeVisible();

    // 5) Busca de aulas encontra a aula pela cidade.
    await v.goto("/aulas?cidade=Ourinhos");
    await expect(v.getByRole("main")).toContainText(placeName);

    // 6) A academia confirma o professor; a aula passa a "confirmado".
    const owner = await as(browser, "atleta1@figtherz.local");
    await owner.page.goto("/academias/tatame-central/gerenciar#equipe");
    const request = owner.page.getByRole("listitem").filter({ hasText: "@atleta14" }).filter({ hasText: "diz que dá aula aqui" });
    await request.getByRole("button", { name: "Aprovar" }).click();
    await t.reload();
    await expect(t.getByRole("listitem").filter({ hasText: "Tatame Central" }).first()).toContainText("Confirmado pela academia");

    // 7) Explorar mostra próximas aulas (o atleta14 não tem cidade no perfil: lista geral).
    await t.goto("/explorar");
    await expect(t.getByRole("heading", { name: /Próximas aulas/ })).toBeVisible();

    // Limpeza: remove os locais (as aulas saem junto) e o vínculo, para o teste poder rodar de novo.
    await t.goto("/professor#minha-grade");
    await t.getByRole("button", { name: `Remover ${placeName}` }).click();
    await expect(t.getByText("Local e aulas dele removidos.")).toBeVisible();
    await t.getByRole("button", { name: /^Remover Tatame Central/ }).click();
    await expect(t.getByText("Local e aulas dele removidos.")).toBeVisible();
    await t.goto("/professor#vinculos");
    await t.getByRole("listitem").filter({ hasText: "Tatame Central" }).getByRole("button", { name: "Sair" }).click();

    await Promise.all([teacher.context.close(), visitor.close(), owner.context.close()]);
  });
});
