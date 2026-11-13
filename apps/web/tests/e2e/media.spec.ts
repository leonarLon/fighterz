import { expect, test, type Page } from "@playwright/test";
import { createConfirmedUser, makePng } from "./helpers";

/** Grava um WebM curto (2 s) no próprio navegador, com canvas + MediaRecorder. Nada vem da internet. */
async function recordWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 180;
    const g = c.getContext("2d")!;
    const recorder = new MediaRecorder(c.captureStream(24), { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (recorder.onstop = r));
    recorder.start(200);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = (performance.now() - start) / 1000;
        g.fillStyle = "#1D4ED8";
        g.fillRect(0, 0, 320, 180);
        g.fillStyle = "#fff";
        g.fillRect(40 + t * 80, 60, 60, 60);
        if (t < 2) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    recorder.stop();
    await stopped;
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(bin);
  });
  return Buffer.from(base64, "base64");
}

test.describe("vídeo em posts", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "MediaRecorder WebM no Chromium");

  test("publicar vídeo: miniatura, player e duração", async ({ page }) => {
    await createConfirmedUser(page, "video");
    await page.goto("/publicar");
    const webm = await recordWebm(page);

    await page.getByLabel("Legenda").fill("Drill gravado no treino");
    await page.locator("#video").setInputFiles({ name: "drill.webm", mimeType: "video/webm", buffer: webm });
    await expect(page.getByLabel("Descrição do vídeo")).toBeVisible();
    // Com vídeo, fotos ficam bloqueadas (um vídeo por post).
    await expect(page.locator("#photos")).toBeDisabled();
    await page.getByLabel("Descrição do vídeo").fill("Quadrado branco atravessando a tela");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    const video = page.locator("main article video");
    await expect(video).toHaveAttribute("controls", "");
    await expect(video).toHaveAttribute("aria-label", "Vídeo: Quadrado branco atravessando a tela");
    await expect(video).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/post-media\/.+\.webm\?token=/);
    await expect(video).toHaveAttribute("poster", /-poster\.webp\?token=/);
  });

  test("arquivo que não é vídeo é recusado", async ({ page }) => {
    await createConfirmedUser(page, "falso");
    await page.goto("/publicar");
    await page.locator("#video").setInputFiles({ name: "golpe.mp4", mimeType: "video/mp4", buffer: Buffer.from("isto não é um vídeo") });
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("não é um vídeo válido");
  });
});

test("foto de perfil: recorte, envio e exibição no perfil", async ({ page }) => {
  const user = await createConfirmedUser(page, "avatar");
  await page.goto("/perfil");
  await page.locator("#avatar").setInputFiles({ name: "eu.png", mimeType: "image/png", buffer: makePng(640, 480) });
  await expect(page.getByText("Foto atualizada.")).toBeVisible();
  await page.goto(`/u/${user.username}`);
  const img = page.locator("main img").first();
  await expect(img).toHaveAttribute("src", new RegExp(`/storage/v1/object/public/avatars/[0-9a-f-]{36}/avatar-[a-z0-9]+\.webp$`));
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth === el.naturalHeight)).toBe(true);
});
