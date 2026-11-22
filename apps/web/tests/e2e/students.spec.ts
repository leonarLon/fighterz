import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createConfirmedUser, signInViaUi } from "./helpers";

// Alunos do professor: pedido do aluno, convite do professor (aceite mútuo) e total no perfil.

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

async function studentCount(page: Page, url: string) {
  await page.goto(url);
  const text = await page.getByText(/^\d+\s*alunos?$/).first().textContent();
  return Number(text?.match(/\d+/)?.[0]);
}

test.describe("alunos do professor", () => {
  test.skip(({ isMobile }) => isMobile, "fluxos de várias contas rodam só no desktop");

  test("aluno pede, professor aceita; professor convida, aluno aceita; total aparece no perfil", async ({ browser }) => {
    test.setTimeout(120_000);
    const teacherUrl = "/professores/atleta16";

    // 1) Pessoa nova pede para constar como aluna.
    const aCtx = await browser.newContext({ locale: "pt-BR" });
    const a = await aCtx.newPage();
    const userA = await createConfirmedUser(a, "aluno");
    const before = await studentCount(a, teacherUrl);
    await a.getByRole("button", { name: "Sou aluno de Kru Thiago Barros" }).click();
    await expect(a.getByText("Pedido enviado, aguardando o professor")).toBeVisible();

    // 2) Professor aceita o pedido e convida outra pessoa.
    const bCtx = await browser.newContext({ locale: "pt-BR" });
    const b = await bCtx.newPage();
    const userB = await createConfirmedUser(b, "convidado");

    const teacher = await as(browser, "atleta16@figtherz.local");
    await teacher.page.goto("/professor#alunos");
    const row = teacher.page.getByRole("listitem").filter({ hasText: `@${userA.username}` });
    await expect(row).toContainText("Pediu para constar como seu aluno");
    await row.getByRole("button", { name: "Aceitar" }).click();
    await expect(teacher.page.getByText("Vínculo aceito.")).toBeVisible();
    await expect(row).toContainText("Aluno");

    await teacher.page.getByLabel("Adicionar aluno").fill(`@${userB.username}`);
    await teacher.page.getByRole("button", { name: "Convidar" }).click();
    await expect(teacher.page.getByText(`@${userB.username} precisa aceitar`)).toBeVisible();
    await expect(teacher.page.getByRole("listitem").filter({ hasText: `@${userB.username}` })).toContainText("Convite enviado");
    await expectNoAxeViolations(teacher.page);

    // 3) Convidado aceita na Jornada.
    await b.goto("/jornada#professores");
    const invite = b.getByRole("listitem").filter({ hasText: "Kru Thiago Barros" });
    await expect(invite).toContainText("Convidou você para a lista de alunos");
    await invite.getByRole("button", { name: "Aceitar" }).click();
    await expect(invite).toContainText("Seu professor");
    await expectNoAxeViolations(b);

    // 4) Total público subiu 2, na página do professor e no perfil.
    expect(await studentCount(a, teacherUrl)).toBe(before + 2);
    await expect(a.getByText("Você é aluno deste professor")).toBeVisible();
    expect(await studentCount(a, "/u/atleta16")).toBe(before + 2);

    // 5) Aluno deixa a lista; o total desce.
    await a.goto(teacherUrl);
    await a.getByRole("button", { name: "Deixar de ser aluno" }).click();
    await expect(a.getByText("Vínculo desfeito.")).toBeVisible();
    expect(await studentCount(a, teacherUrl)).toBe(before + 1);

    await Promise.all([aCtx.close(), bCtx.close(), teacher.context.close()]);
  });

  test("visitante vê o total e é convidado a entrar", async ({ page }) => {
    await page.goto("/professores/atleta2");
    await expect(page.getByText(/^\d+\s*alunos?$/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar para dizer que é aluno" })).toBeVisible();
  });
});
