import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

/** Lê apps/web/.env.local (o Playwright não carrega .env sozinho). */
export function localEnv(): Record<string, string> {
  const raw = readFileSync(join(__dirname, "..", "..", ".env.local"), "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
}

export function uniqueUser(tag: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `e2e-${tag}-${id}@test.local`,
    username: `e2e_${tag}_${id}`.slice(0, 30),
    displayName: "Atleta Teste",
    password: "Tatame2026",
  };
}

/** Busca no Mailpit o link mais recente enviado para `email` que contenha `pathPart`. */
export async function linkFromEmail(email: string, pathPart: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const { messages } = (await search.json()) as { messages: Array<{ ID: string }> };
        const latest = messages[0];
        if (!latest) return null;
        const message = (await (await fetch(`${MAILPIT}/api/v1/message/${latest.ID}`)).json()) as { HTML: string };
        const href = /href="([^"]+)"/.exec(message.HTML)?.[1]?.replaceAll("&amp;", "&");
        link = href?.includes(pathPart) ? href : undefined;
        return link ?? null;
      },
      { timeout: 15_000, message: `e-mail para ${email} com link ${pathPart}` },
    )
    .not.toBeNull();
  return link!;
}

export async function signUpViaUi(page: Page, user: ReturnType<typeof uniqueUser>, birthDate = "1995-04-10") {
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill(user.displayName);
  await page.getByLabel("Nome de usuário").fill(user.username);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Data de nascimento").fill(birthDate);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByLabel("Confirmar senha").fill(user.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}

export async function signInViaUi(page: Page, email: string, password: string, { navigate = true } = {}) {
  if (navigate) await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Cria e confirma uma conta pelo fluxo real (UI + link do Mailpit). Termina logado no feed. */
export async function createConfirmedUser(page: Page, tag: string) {
  const user = uniqueUser(tag);
  await signUpViaUi(page, user);
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await page.goto(await linkFromEmail(user.email, "/auth/confirm"));
  await expect(page).toHaveURL(/\/inicio$/);
  return user;
}

/** Mensagem de erro do formulário (o Next também tem um anunciador de rotas com role=alert). */
export function formAlert(page: Page) {
  return page.locator("main [role=alert]");
}

export async function signOutViaUi(page: Page) {
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

/** PNG real (gradiente) gerado na hora, para testar o upload sem arquivos binários no repositório. */
export function makePng(width = 320, height = 240): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // 8 bits
  header.writeUInt8(2, 9); // RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3] = Math.round((x / width) * 255);
      raw[row + 2 + x * 3] = 30;
      raw[row + 3 + x * 3] = Math.round((y / height) * 255);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const DEMO = { email: "demo@figtherz.local", password: "Figtherz123", username: "demo" };
