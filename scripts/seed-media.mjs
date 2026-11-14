// Mídia de demonstração: fotos (WebP) e vídeos curtos (WebM) desenhados num Chromium headless (o do
// Playwright), enviados ao Storage e publicados nos perfis do seed. Nada é baixado da internet.
// Local (padrão): `npm run db:seed-media` (depois de `npm run db:reset`).
// Remoto (decisão do usuário em 14/11/2026, demonstração no site publicado): `npm run db:seed-media -- --remote`
// com SUPABASE_URL e SUPABASE_SECRET_KEY definidas no terminal (a chave nunca vai para o repositório).
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

let url;
let key;
if (process.argv.includes("--remote")) {
  url = process.env.SUPABASE_URL;
  key = process.env.SUPABASE_SECRET_KEY;
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url ?? "") || !key) {
    console.error("Recusado: --remote exige SUPABASE_URL (https://<ref>.supabase.co) e SUPABASE_SECRET_KEY no ambiente.");
    process.exit(1);
  }
  console.log(`Destino REMOTO: ${url}`);
} else {
  const env = Object.fromEntries(
    execSync("npx supabase status -o env", { encoding: "utf8" })
      .split(/\r?\n/)
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
  );
  url = env.API_URL;
  key = env.SERVICE_ROLE_KEY;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url ?? "")) {
    console.error(`Recusado: sem --remote, este script só roda contra o Supabase local (API_URL=${url}).`);
    process.exit(1);
  }
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const force = process.argv.includes("--force");
const { count } = await supabase.from("post_media").select("id", { count: "exact", head: true }).like("storage_path", "%/seed-%");
if (count && !force) {
  console.log(`Já existem ${count} mídias de demonstração. Use --force para criar mais.`);
  process.exit(0);
}

const { data: people } = await supabase
  .from("profiles")
  .select("id, username, display_name")
  .like("username", "atleta%")
  .order("username");
const { data: arts } = await supabase.from("martial_arts").select("id, slug, name").neq("slug", "outra");
if (!people?.length || !arts?.length) throw new Error("Rode `npm run db:reset` antes (seed sem atletas).");

const PALETTES = [
  ["#0F172A", "#1D4ED8", "#F59E0B"],
  ["#111111", "#DC2626", "#FAFAFA"],
  ["#052E16", "#16A34A", "#FDE68A"],
  ["#2E1065", "#7E22CE", "#F0ABFC"],
  ["#431407", "#EA580C", "#FFEDD5"],
  ["#0C4A6E", "#0EA5E9", "#E0F2FE"],
];
const PHOTO_CAPTIONS = [
  "Treino de técnica hoje. Detalhe por detalhe.",
  "Turma da manhã sempre cheia de energia.",
  "Faixa nova na cintura! Obrigado a todos que treinaram comigo.",
  "Seminário incrível no fim de semana.",
  "Pós-treino: cansado e feliz.",
  "Kimono lavado, mochila pronta. Bora!",
  "Pódio no campeonato regional. Trabalho em equipe.",
  "Aula de fundamentos para quem está começando.",
];
const VIDEO_CAPTIONS = [
  "Drill de entrada de queda em câmera lenta.",
  "Sequência de combinação no aparador.",
  "Round de sparring leve com a turma.",
  "Raspagem da guarda aberta, passo a passo.",
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>seed</title><body></body>");

/** Desenha no canvas da página. Tudo roda dentro do navegador. */
async function makePhoto(seed, title, subtitle) {
  return page.evaluate(
    ({ seed, title, subtitle, palette }) => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 900;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 1200, 900);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, 1200, 900);
      // Tatame
      g.strokeStyle = "rgba(255,255,255,0.08)";
      g.lineWidth = 4;
      for (let x = 0; x <= 1200; x += 150) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 900); g.stroke(); }
      for (let y = 0; y <= 900; y += 150) { g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
      // Dois "atletas" estilizados
      const rand = (n) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
      for (let k = 0; k < 2; k++) {
        const cx = 380 + k * 440 + rand(k) * 60;
        g.fillStyle = k ? palette[2] : "rgba(255,255,255,0.92)";
        g.beginPath(); g.arc(cx, 330, 62, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.roundRect(cx - 85, 410, 170, 260, 40); g.fill();
        g.fillStyle = palette[0];
        g.fillRect(cx - 85, 560, 170, 26); // faixa
      }
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, 720, 1200, 180);
      g.fillStyle = "#fff";
      g.font = "bold 64px sans-serif";
      g.fillText(title, 60, 805);
      g.font = "36px sans-serif";
      g.fillText(subtitle, 60, 860);
      return c.toDataURL("image/webp", 0.82).split(",")[1];
    },
    { seed, title, subtitle, palette: PALETTES[seed % PALETTES.length] },
  );
}

async function makeVideo(seed, title) {
  return page.evaluate(
    async ({ seed, title, palette }) => {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 360;
      const g = c.getContext("2d");
      const stream = c.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 900_000 });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((resolve) => (recorder.onstop = resolve));
      const start = performance.now();
      const seconds = 4;
      let poster = null;
      recorder.start(250);
      await new Promise((resolve) => {
        const frame = () => {
          const t = (performance.now() - start) / 1000;
          g.fillStyle = palette[0];
          g.fillRect(0, 0, 640, 360);
          g.fillStyle = palette[1];
          g.fillRect(0, 300, 640, 60);
          const x = 120 + Math.sin(t * 2.4 + seed) * 90;
          const x2 = 520 - Math.sin(t * 2.4 + seed + 1) * 90;
          for (const [px, color] of [[x, "#fff"], [x2, palette[2]]]) {
            g.fillStyle = color;
            g.beginPath(); g.arc(px, 150, 34, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.roundRect(px - 45, 192, 90, 108, 20); g.fill();
          }
          g.fillStyle = "#fff";
          g.font = "bold 30px sans-serif";
          g.fillText(title, 24, 46);
          g.font = "22px monospace";
          g.fillText(`0:0${Math.min(seconds, Math.floor(t))}`, 560, 46);
          if (!poster && t > 1) poster = c.toDataURL("image/webp", 0.8).split(",")[1];
          if (t < seconds) requestAnimationFrame(frame);
          else resolve();
        };
        frame();
      });
      recorder.stop();
      await done;
      const blob = new Blob(chunks, { type: "video/webm" });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { video: btoa(bin), poster, durationMs: seconds * 1000 };
    },
    { seed, title, palette: PALETTES[seed % PALETTES.length] },
  );
}

async function upload(path, base64, contentType) {
  const { error } = await supabase.storage.from("post-media").upload(path, Buffer.from(base64, "base64"), { contentType, upsert: false });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
let photos = 0;
let videos = 0;

// Fotos: 2 posts por atleta nos 20 primeiros (1 a 3 fotos cada).
for (const [i, person] of people.slice(0, 20).entries()) {
  for (let k = 0; k < 2; k++) {
    const seed = i * 2 + k;
    const art = arts[seed % arts.length];
    const postId = randomUUID();
    const { error } = await supabase.from("posts").insert({
      id: postId,
      author_id: person.id,
      caption: PHOTO_CAPTIONS[seed % PHOTO_CAPTIONS.length],
      visibility: "public",
      martial_art_id: art.id,
      created_at: hoursAgo(2 + seed * 3),
    });
    if (error) throw error;
    const n = 1 + (seed % 3);
    for (let pos = 0; pos < n; pos++) {
      const path = `${person.id}/${postId}/${pos}-seed-${randomUUID().slice(0, 8)}.webp`;
      await upload(path, await makePhoto(seed * 7 + pos, art.name, `${person.display_name} · foto ${pos + 1}`), "image/webp");
      const { error: mediaError } = await supabase.from("post_media").insert({
        post_id: postId, position: pos, type: "image", storage_path: path, width: 1200, height: 900,
        alt_text: `Ilustração de dois atletas no tatame, ${art.name}`,
      });
      if (mediaError) throw mediaError;
      photos++;
    }
  }
}

// Vídeos: 8 posts de vídeo curto (4 s) distribuídos entre atletas e professores.
for (let v = 0; v < 8; v++) {
  const person = people[(v * 3 + 1) % people.length];
  const art = arts[(v * 5) % arts.length];
  const postId = randomUUID();
  const title = `${art.name}: ${VIDEO_CAPTIONS[v % VIDEO_CAPTIONS.length].split(" ").slice(0, 3).join(" ")}`;
  const clip = await makeVideo(v, title);
  const random = randomUUID().slice(0, 8);
  const path = `${person.id}/${postId}/0-seed-${random}.webm`;
  const posterPath = `${person.id}/${postId}/0-seed-${random}-poster.webp`;
  const { error } = await supabase.from("posts").insert({
    id: postId, author_id: person.id, caption: VIDEO_CAPTIONS[v % VIDEO_CAPTIONS.length],
    visibility: "public", martial_art_id: art.id, created_at: hoursAgo(1 + v * 5),
  });
  if (error) throw error;
  await upload(path, clip.video, "video/webm");
  if (clip.poster) await upload(posterPath, clip.poster, "image/webp");
  const { error: mediaError } = await supabase.from("post_media").insert({
    post_id: postId, position: 0, type: "video", storage_path: path, thumbnail_path: clip.poster ? posterPath : null,
    width: 640, height: 360, duration_ms: clip.durationMs, alt_text: `Animação de treino de ${art.name}`,
  });
  if (mediaError) throw mediaError;
  videos++;
}

// Fotos de perfil (ilustração com silhueta) para os atletas e a conta demo.
const { data: demo } = await supabase.from("profiles").select("id, username, display_name").eq("username", "demo").single();
let avatars = 0;
for (const [i, person] of [...people, demo].filter(Boolean).entries()) {
  const base64 = await page.evaluate(
    ({ palette, initials }) => {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 400;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, palette[1]);
      grad.addColorStop(1, palette[0]);
      g.fillStyle = grad;
      g.fillRect(0, 0, 400, 400);
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.beginPath(); g.arc(200, 160, 78, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(200, 400, 150, 140, 0, Math.PI, 0); g.fill();
      g.fillStyle = palette[2];
      g.font = "bold 44px sans-serif";
      g.textAlign = "center";
      g.fillText(initials, 200, 176);
      return c.toDataURL("image/webp", 0.85).split(",")[1];
    },
    {
      palette: PALETTES[i % PALETTES.length],
      initials: person.display_name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase(),
    },
  );
  const path = `${person.id}/avatar-${randomUUID().replace(/-/g, "").slice(0, 12)}.webp`;
  const { error } = await supabase.storage.from("avatars").upload(path, Buffer.from(base64, "base64"), { contentType: "image/webp" });
  if (error) throw new Error(`avatar ${person.username}: ${error.message}`);
  await supabase.from("profiles").update({ avatar_path: path }).eq("id", person.id);
  avatars++;
}

await browser.close();
console.log(`Mídia de demonstração criada: ${photos} fotos, ${videos} vídeos e ${avatars} fotos de perfil.`);
