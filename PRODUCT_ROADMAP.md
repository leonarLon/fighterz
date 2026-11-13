# Roadmap do Produto

> Status: Fase 1 **aprovada em 13/11/2026.** IA removida do escopo.

## Nome do projeto
**Figtherz**, definido em 13/11/2026. Antes de uma abertura pública, vale fazer a busca de marca no INPI (gratuita) e checar domínios e nomes em lojas de apps.

## Personas de validação (critério final de qualidade)
| Persona | Pergunta-chave | Tela que responde |
|---|---|---|
| Iniciante no Jiu-Jitsu | "Onde começo e como acompanho minha evolução?" | Busca de aulas (iniciante + experimental) → Jornada |
| Professor em 3 academias | "Como mostro toda minha grade num só lugar?" | Perfil de professor com grade unificada e mapa |
| Praticante de Muay Thai | "Como compartilho minha evolução?" | Check-in → post, graduação no perfil |
| Academia | "Como divulgo treinos e professores?" | Página da academia: modalidades, grade, unidades, posts |
| Atleta competidor | "Que campeonatos vêm por aí?" | Eventos filtrados por modalidade/estado + conquistas |
| Quem procura academia perto | "Tem algo perto de mim?" | Mapa/lista por distância, cidade ou bairro |

## Fases

### Fase 1: Pesquisa e planejamento ✅ (este pacote de documentos)

### Fase 2: Fundação
- Pré-requisito do ambiente: **instalar WSL2 + Docker Desktop + Supabase CLI** (exige reinício do Windows, ação sua).
- Monorepo, Next.js, Tailwind, tokens do design system, temas claro/escuro/automático.
- Migrations: extensões, perfis, settings, papéis, modalidades + graduações (seed), RLS base, rate limit.
- Auth: cadastro (18+), login, recuperação, confirmação via Mailpit local, logout, rotas protegidas, exclusão de conta.
- Layout: barra inferior (mobile), menu lateral (desktop).
- **Aceite:** pgTAP + Vitest + Playwright verdes. Usuário cria conta, edita perfil e troca tema, e o tema persiste.

### Fase 3: Rede social ✅ (aceita em 13/11/2026)
- Posts (texto, até 10 imagens, 1 vídeo ≤ 60 s), mídia otimizada no cliente, worker FFmpeg opcional.
- Feed cronológico por cursor, curtidas, comentários + respostas, salvos, seguir/privado/solicitações, compartilhar (link + Web Share), marcações com aprovação, Explorar, notificações com Realtime, bloqueio e denúncia básica.
- **Aceite:** feed com 1.000 posts de seed carrega a 1ª página em < 300 ms local, sem N+1. Curtida dupla impossível.

### Fase 4: Professores e academias (aceita em 13/11/2026)
- Solicitação de perfil profissional + aprovação admin, academias, unidades (CEP → ViaCEP, pino confirmado), vínculos com aceite mútuo, grade de aulas, página pública sem login, mapa Leaflet, rotas externas, copiar/compartilhar endereço, busca por distância/cidade/bairro.
- **Aceite:** o professor de 3 academias vê grade unificada. O visitante sem login consulta grade e mapa.

### Fase 5: Evolução e comunidade esportiva
- Jornada por modalidade (graduações e histórico), confirmação pelo professor, conquistas, check-in → post opcional, histórico/calendário, eventos + interesse/salvar.
- **Aceite:** graduação BJJ com graus validados. Check-in exibido como "registrou treino".

### Fase 6: Administração e segurança
- Painel admin (usuários, professores, academias, unidades, posts, denúncias, modalidades, eventos, verificações, configurações), moderação com histórico, suspensão, auditoria, revisão completa de RLS.

### Fase 7: Finalização
- Acessibilidade (axe), performance, testes completos, documentação, preparo de deploy gratuito (**com sua autorização**), plano do app Expo.

## MVP sugerido (para validar com pessoas reais o quanto antes)
Fases 2 + 3 (sem vídeo) + 4 = **rede social + página de professor/academia com grade e mapa**. É o núcleo diferencial. Jornada e eventos vêm em seguida.

## Futuro (fora do escopo atual)
Mensagens privadas · contas de menores vinculadas a responsáveis · Web Push · recomendações no feed · app Expo · tiles próprios (PMTiles) · importação de resultados de campeonatos.

## Decisões (13/11/2026)
| # | Decisão | Status |
|---|---|---|
| 1 | Stack: Next.js + Supabase + Leaflet/OSM | ✅ Aprovada |
| 2 | Somente maiores de 18 anos no MVP | ✅ Aprovada |
| 3 | Ambiente do banco: Supabase local (Docker) ou Supabase Free na nuvem | ⏳ Em discussão |
| 4 | Limites de mídia (10 fotos/post, vídeo ≤ 60 s / 25 MB) | ✅ Aprovada |
| 5 | Corte do MVP | ✅ Aprovada |
| 6 | Nome: Figtherz | ✅ Definido |
| 7 | Inteligência artificial | ❌ Removida do escopo |
| 8 | Hospedagem de produção | Decidir na fase de finalização |
