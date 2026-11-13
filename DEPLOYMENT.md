# Deploy e Execução

> Status: **planejamento.** Nada foi publicado. Toda ação remota (criar projeto Supabase, rodar migration remota, publicar) exige **autorização explícita**.

## 1. Pré-requisitos locais (Windows 11)
| Ferramenta | Status nesta máquina | Como instalar |
|---|---|---|
| Node.js ≥ 20 | ✅ 24.22 | — |
| Git | ✅ 2.44 | — |
| WSL2 | ❌ | `wsl --install` em terminal de administrador → reiniciar |
| Docker Desktop (backend WSL2) | ❌ | https://www.docker.com/products/docker-desktop/ (verificar condições da licença gratuita) |
| Supabase CLI | ❌ | via `npx supabase` (dependência de dev do projeto) |
| FFmpeg (opcional) | ❌ | `winget install Gyan.FFmpeg` |

## 2. Execução local
```
npm install
npx supabase start          # sobe Postgres, Auth, Storage, Studio e Mailpit em Docker
npx supabase db reset       # aplica migrations + seed
cp apps/web/.env.example apps/web/.env.local   # preencher com `npx supabase status -o env` (API_URL e PUBLISHABLE_KEY)
npm run dev                 # http://localhost:3000
```
- Studio (painel do banco): http://localhost:54323
- E-mails de confirmação/recuperação: Mailpit em http://127.0.0.1:54324 (templates em `supabase/templates/`)
- Contas de demonstração do `seed.sql` (só local): `demo@figtherz.local` e `admin@figtherz.local` (superadmin), senha `Figtherz123`
- No Windows, rode `npm`/`npx` pelo PowerShell se o Git Bash não tiver rede

## 3. Variáveis de ambiente
| Variável | Onde | Segredo? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | não |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente | não (protegida por RLS) |
| `NEXT_PUBLIC_SITE_URL` | cliente/servidor | não (base dos links de e-mail) |
| `SUPABASE_SECRET_KEY` | **somente servidor** | **sim**. Ainda não usada: a exclusão de conta roda via RPC com a sessão do usuário |
| `APP_USER_AGENT` | servidor | não. User-Agent das chamadas à ViaCEP e ao Nominatim. Padrão local: `Figtherz/0.1 (ambiente de desenvolvimento local)`. **Antes de publicar**, defina com o e-mail de contato do projeto, no formato `Figtherz/0.1 (contato: email@dominio)`, como exige a política do Nominatim. O e-mail fica só na variável de ambiente do servidor, não no repositório |
| `MEDIA_WORKER_ENABLED` | servidor | não |

`.env.local` nunca é commitado. Só `.env.example` sem valores.

## 4. Migrations
- Criar: `npx supabase migration new <nome>` → SQL em `supabase/migrations/`.
- Aplicar local: `npx supabase db reset` (recria do zero) ou `npx supabase migration up`.
- Testar RLS: `npx supabase test db` (pgTAP).
- Gerar tipos: `npx supabase gen types typescript --local > packages/core/src/db/types.ts` (atalho: `npm run db:types`).
- **Remoto:** `supabase db push` só com sua autorização, após `db diff` revisado.
- A migration 15 usa **pg_cron** (incluso e gratuito no Supabase) para expirar suspensões. No projeto remoto, confirme que a extensão está habilitada antes do `db push`.

## 5. Testes
`npm run test` (Vitest) · `npm run test:e2e` (Playwright, exige `supabase start`; na 1ª vez rode `npx playwright install chromium` em `apps/web`) · `npm run db:test` (pgTAP) · `npm run typecheck` · `npm run lint`.

## 6. Backup
- Local: `npx supabase db dump -f backups/schema.sql` + `--data-only` para dados, e cópia do volume de storage.
- Remoto (se houver): `pg_dump` com a connection string, guardado fora do repositório.

## 7. Opções de publicação gratuita (decisão na Fase 7, finalização)
| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **A. Vercel Hobby + Supabase Free** | R$ 0 | Mais simples, Next.js nativo | **Uso não comercial apenas** (termos Vercel). Limites de storage/egress. Pausa por inatividade. Cartão no Supabase a confirmar |
| **B. Cloudflare Workers (OpenNext) + Supabase Free** | R$ 0 | Uso comercial permitido no Free | Limite de CPU por requisição muito baixo, adaptação do Next.js |
| **C. Auto-hospedagem + Cloudflare Tunnel** | R$ 0 em serviços | Sem limites de terceiros, FFmpeg funciona | Depende do PC ligado. Energia elétrica. Upload doméstico |

Nenhuma opção oferece disponibilidade contínua garantida, armazenamento ilimitado ou escala comercial.
