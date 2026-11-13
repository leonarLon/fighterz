import { expect, test } from "@playwright/test";
import { createConfirmedUser, formAlert, linkFromEmail, signInViaUi, signOutViaUi, signUpViaUi, uniqueUser } from "./helpers";

test.describe("cadastro e login", () => {
  test("jornada completa: cadastro, confirmação, perfil, tema, sair, entrar e excluir conta", async ({ page, context }) => {
    const user = await createConfirmedUser(page, "jornada");
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
    await expect(page.getByText("Seu feed ainda está vazio")).toBeVisible();

    // Editar perfil
    await page.goto("/perfil");
    await page.getByLabel("Bio").fill("Faixa azul de jiu-jitsu.");
    await page.getByLabel("Cidade").fill("Curitiba");
    await page.getByLabel("Estado").selectOption("PR");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByRole("status")).toHaveText("Perfil atualizado.");
    await page.goto(`/u/${user.username}`);
    await expect(page.getByText("Faixa azul de jiu-jitsu.")).toBeVisible();
    await expect(page.getByText("Curitiba · PR")).toBeVisible();

    // Trocar tema: aplica na hora e persiste ao recarregar
    await page.goto("/configuracoes");
    await page.getByText("Escuro", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Sair, limpar cookies (como outro dispositivo) e entrar: o tema vem da conta
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/");
    await context.clearCookies();
    await page.goto("/entrar");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
    await signInViaUi(page, user.email, user.password);
    await expect(page).toHaveURL(/\/inicio$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Excluir conta exige senha correta
    await page.goto("/configuracoes");
    const deleteForm = page.locator("form", { has: page.getByRole("button", { name: "Excluir minha conta" }) });
    await deleteForm.getByLabel("Sua senha").fill("SenhaErrada1");
    await deleteForm.getByLabel(/Digite "EXCLUIR"/).fill("EXCLUIR");
    await deleteForm.getByRole("button", { name: "Excluir minha conta" }).click();
    await expect(deleteForm.getByText("Senha incorreta.")).toBeVisible();

    await deleteForm.getByLabel("Sua senha").fill(user.password);
    await deleteForm.getByLabel(/Digite "EXCLUIR"/).fill("EXCLUIR");
    await deleteForm.getByRole("button", { name: "Excluir minha conta" }).click();
    await expect(page).toHaveURL(/conta=excluida/);
    await expect(page.getByText("Sua conta e seus dados foram excluídos.")).toBeVisible();

    // A conta não existe mais
    await signInViaUi(page, user.email, user.password);
    await expect(formAlert(page)).toHaveText("E-mail ou senha incorretos.");
    await page.goto(`/u/${user.username}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });

  test("menor de 18 anos não consegue se cadastrar", async ({ page }) => {
    const user = uniqueUser("menor");
    const today = new Date();
    const seventeen = `${today.getFullYear() - 17}-01-01`;
    await signUpViaUi(page, user, seventeen);
    await expect(page.getByText("É preciso ter 18 anos ou mais para criar uma conta.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue(user.email);
  });

  test("login antes de confirmar o e-mail é recusado", async ({ page }) => {
    const user = uniqueUser("semconf");
    await signUpViaUi(page, user);
    await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
    await signInViaUi(page, user.email, user.password);
    await expect(formAlert(page)).toContainText("Confirme seu e-mail");
  });

  test("senha errada mostra mensagem genérica", async ({ page }) => {
    await signInViaUi(page, "ninguem@test.local", "Qualquer123");
    await expect(formAlert(page)).toHaveText("E-mail ou senha incorretos.");
  });

  test("recuperação de senha pelo e-mail", async ({ page, context }) => {
    const user = await createConfirmedUser(page, "recup");
    await signOutViaUi(page);
    await context.clearCookies();

    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByRole("status")).toContainText("Se houver uma conta com esse e-mail");

    await page.goto(await linkFromEmail(user.email, "type=recovery"));
    await expect(page).toHaveURL(/\/redefinir-senha$/);
    await page.getByLabel("Nova senha", { exact: true }).fill("Kimono2027");
    await page.getByLabel("Confirmar nova senha").fill("Kimono2027");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible();

    await signOutViaUi(page);
    await signInViaUi(page, user.email, "Kimono2027");
    await expect(page).toHaveURL(/\/inicio$/);
  });
});

test.describe("rotas protegidas", () => {
  test("visitante é levado ao login e volta para onde ia", async ({ page }) => {
    await page.goto("/configuracoes");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fconfiguracoes/);
    await signInViaUi(page, "demo@figtherz.local", "Figtherz123", { navigate: false });
    await expect(page).toHaveURL(/\/configuracoes$/);
  });

  test("next externo é ignorado (sem open redirect)", async ({ page }) => {
    await page.goto("/entrar?next=//malicioso.example");
    await page.getByLabel("E-mail").fill("demo@figtherz.local");
    await page.getByLabel("Senha").fill("Figtherz123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/localhost:3000\/inicio$/);
  });

  test("perfil público abre sem login", async ({ page }) => {
    await page.goto("/u/demo");
    await expect(page.getByRole("heading", { name: "Atleta Demo" })).toBeVisible();
  });
});
