# Figtherz

Rede social para praticantes, professores e academias de artes marciais e esportes de combate: comunidade, descoberta de academias e aulas, perfil profissional, jornada de evolução, check-in de treinos e eventos. Construída sob uma **política de custo zero**.

> **Status:** Fase 2 (fundação) implementada em 13/11/2026, 100% local: cadastro 18+, login, recuperação de senha, perfil, temas e navegação. Ver `PRODUCT_ROADMAP.md`.

## Documentação
| Documento | Conteúdo |
|---|---|
| [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) | Engenharia reversa de experiência, matriz competitiva, oportunidades |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, estrutura do monorepo, fluxos, mídia, gargalos |
| [DATA_MODEL.md](DATA_MODEL.md) | Tabelas, relacionamentos, índices, RLS, storage |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Cores, temas, tipografia, componentes, acessibilidade |
| [SECURITY.md](SECURITY.md) | Permissões, proteções, moderação, menores, LGPD |
| [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) | Registro da decisão: IA removida do escopo |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | Fases, MVP, decisões aprovadas |
| [COST_ZERO_POLICY.md](COST_ZERO_POLICY.md) | Checagem de custo de cada tecnologia e serviço |
| [COST_ESTIMATE.md](COST_ESTIMATE.md) | Estimativa de custos e limitações |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Instalação, execução local, migrations, testes, opções de publicação |

## Início rápido
Pré-requisitos: Node 20+, Docker Desktop.
```
npm install
npm run db:start            # Supabase local (Docker)
npm run db:reset            # migrations + seed
cp apps/web/.env.example apps/web/.env.local   # preencher com `npx supabase status -o env`
npm run dev                 # http://localhost:3000
```
Detalhes, testes e contas de demonstração em [DEPLOYMENT.md](DEPLOYMENT.md).
