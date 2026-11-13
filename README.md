# Figtherz

Rede social para praticantes, professores e academias de artes marciais e esportes de combate: comunidade, descoberta de academias e aulas, perfil profissional, jornada de evolução, registro de treinos, eventos e moderação. Construída sob uma **política de custo zero**.

> **Status:** Fases 1 a 6 aceitas; Fase 7 (finalização) implementada em 13/11/2026, aguardando aceite. Tudo roda 100% local (Supabase CLI + Docker). Publicação só com autorização. Ver `PRODUCT_ROADMAP.md`.

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
| [DEPLOYMENT.md](DEPLOYMENT.md) | Instalação, execução local, migrations, testes, checklist de publicação |
| [MOBILE_PLAN.md](MOBILE_PLAN.md) | Plano do app Expo (React Native) |

## Início rápido
Pré-requisitos: Node 20+, Docker Desktop.
```
npm install
npm run db:start            # Supabase local (Docker)
npm run db:reset            # migrations + seed (contas, academias, aulas, jornada, eventos, denúncias)
npm run db:seed-media       # opcional: fotos, vídeos e fotos de perfil de demonstração (gerados localmente)
cp apps/web/.env.example apps/web/.env.local   # preencher com `npx supabase status -o env`
npm run dev                 # http://localhost:3000
```

## Contas de demonstração (somente local, senha `Figtherz123`)
| Conta | Papel |
|---|---|
| `demo@figtherz.local` | usuário comum (faixa azul, treinos, conquistas, aluno da Tatame Central) |
| `atleta1@figtherz.local` … `atleta25@figtherz.local` | 25 atletas com posts, follows e comentários |
| `atleta2`, `atleta6`, `atleta14`–`atleta18` | professores aprovados (atleta2 dá aula em 3 academias) |
| `atleta7` | pedido de professor pendente |
| `atleta1`, `atleta3`, `atleta4`, `atleta5` | donos das 4 academias fictícias |
| `moderador@figtherz.local` | moderador |
| `admin@figtherz.local` | superadmin |

Detalhes, testes e publicação em [DEPLOYMENT.md](DEPLOYMENT.md).
