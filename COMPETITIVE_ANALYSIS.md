# Análise Competitiva e Engenharia Reversa de Experiência

> Objetivo: identificar **padrões** de UX e lacunas de mercado. Nada de código, marca, texto ou ativo visual destas plataformas será copiado.
> Método: análise de experiência pública (apps e sites), documentação oficial de suporte e cobertura especializada. Data: 13/11/2026.

## 1. Plataformas analisadas

| Grupo | Plataforma | Por que importa |
|---|---|---|
| Social | Instagram | Padrão de perfil, grade de mídia, carrossel, stories |
| Social | TikTok | Vídeo vertical, descoberta algorítmica, retenção |
| Social | YouTube | Vídeo longo e educativo, canais, playlists |
| Social/esporte | Strava | Atividade como post, kudos, clubes, histórico pessoal |
| Social | BeReal | Autenticidade, baixa pressão de produção |
| Fitness | ClassPass | Descoberta de aulas por horário e local |
| Fitness | Wellhub (Gympass) | Check-in em academia, mapa de parceiros (forte no Brasil) |
| Gestão | Mindbody | Agenda de aulas e perfil de estúdio |
| Gestão de academias | Zen Planner, Gymdesk, PushPress, Wodify | Graduação de faixas, presença, grade |
| Competição | Smoothcomp | Inscrição, chaves, perfil de atleta, academias |
| Conteúdo | BJJ Fanatics | Instrucionais pagos por professor |
| Diários de BJJ | BJJNote, UnderHooked, BJJ Logger, Post Black Belt etc. | Registro de treino e faixas |

## 2. Análise por plataforma (14 dimensões resumidas)

### Instagram
- **Navegação:** barra inferior com 5 destinos (Início, Busca/Explorar, Criar, Reels, Perfil).
- **Hierarquia:** a mídia domina, o autor fica no topo e as ações (curtir/comentar/compartilhar/salvar) logo abaixo.
- **Onboarding:** cadastro curto e sugestão de quem seguir.
- **Publicação:** seleção → recorte → filtro → legenda/marcações/local, em etapas.
- **Feed/descoberta:** feed algorítmico de seguidos + Explorar em grade.
- **Perfil:** cabeçalho com contadores, bio e link, e grade 3 colunas. Destaques fixados.
- **Interações:** curtir com duplo toque, comentários aninhados de 1 nível, salvar em coleções.
- **Busca:** contas, áudio, tags e lugares.
- **Notificações:** agrupadas ("X e mais 12 curtiram").
- **Mobile:** referência de gestos. **Acessibilidade:** texto alternativo automático/manual.
- **Retenção:** stories, notificações e algoritmo.
- **+** Familiaridade total do usuário. **−** Professor de artes marciais não tem como mostrar grade de aulas e endereço de unidades. O "link na bio" é o remendo.

### TikTok
- **Navegação:** feed vertical em tela cheia como tela inicial ("Para você").
- **Publicação:** câmera nativa + edição. **Descoberta:** algoritmo forte e trilhas sonoras.
- **+** Vídeo curto é o formato natural de técnica/treino. **−** Conteúdo desconectado de contexto real (quem ensina, onde treinar). O vídeo pesado tem custo de infraestrutura que **não cabe** no custo zero.
- **Lição:** vídeo com autoplay silencioso e controles mínimos, mas **não** fazer feed vertical infinito como tela inicial no MVP (custo de banda).

### YouTube
- **+** Conteúdo educativo longo, capítulos, playlists. **−** Nenhuma ligação com a academia física.
- **Lição:** permitir **link** para vídeo externo (YouTube/Vimeo) em vez de hospedar vídeo longo. Economiza storage.

### Strava (referência mais próxima do nosso núcleo)
- **Feed:** a atividade vira post (mapa, estatísticas, fotos, conquistas). "Kudos" é a interação social principal.
- **Clubes:** comunidade em torno de um grupo real.
- **Retenção:** histórico pessoal, metas, retrospectiva anual, sequências.
- **+** Transforma registro de treino em conteúdo social de baixo esforço. **−** Nada específico para artes marciais. Segmentos/ranking não fazem sentido no tatame.
- **Lição:** **check-in de treino → post opcional** e **jornada anual** são o núcleo de retenção. Evitar ranking obrigatório (exigência do produto).

### BeReal
- **Lição:** conteúdo "sem produção" baixa a barreira para postar. Inspira o **check-in rápido** ("treinei hoje") como post simples.

### ClassPass / Mindbody
- **Descoberta:** filtro por modalidade, horário e distância, com lista e mapa lado a lado.
- **Perfil de estúdio:** fotos, descrição, grade semanal, endereço, avaliações.
- **+** Excelente para "quero treinar terça à noite perto de casa". **−** Zero comunidade e zero evolução do aluno. Foco em transação/pagamento.
- **Lição:** grade semanal **legível sem login** e filtro "dia + período + modalidade + nível".

### Wellhub (Gympass)
- **Check-in:** pelo app, confirmando atividade, com validação na catraca/terminal da academia. Histórico de check-ins visível.
- **Descoberta:** mapa de parceiros. Usuários reclamam da falta de filtros por categoria e de academias listadas sem vínculo real.
- **−** Benefício corporativo, inacessível sem empresa contratante.
- **Lição:** check-in sem validação física **não pode** afirmar presença. Nosso check-in é "autodeclarado" por padrão e "confirmado pelo professor" opcionalmente. Vínculos academia↔professor precisam de **aceite das duas partes** (evita a lista com academias falsas).

### Softwares de gestão de academia (Zen Planner, Gymdesk, PushPress, Wodify)
- Recursos comuns: graduação/faixas e currículo, presença (QR, PIN, chamada do professor), grade, cobrança, família.
- **−** Ferramentas internas, voltadas ao dono da academia. O aluno não leva sua história quando troca de academia.
- **Lição:** a **jornada do atleta pertence ao atleta**, é portátil entre academias. Não competir com cobrança e gestão financeira (fora do escopo e com custo).

### Smoothcomp
- Perfil de atleta (público ou privado), inscrição em eventos, chaves, academias aprovadas por federações, listas públicas por divisão/academia.
- **Lição:** eventos com link externo para o regulamento/inscrição oficial. **Não** fazer inscrição nem pagamento. Resultados de campeonato entram como conquistas autodeclaradas na jornada.

### BJJ Fanatics
- Marketplace de instrucionais pagos por professor. **Lição:** o professor quer **autoridade e vitrine**. O perfil profissional deve mostrar credenciais, linhagem e conteúdo. Monetização fica fora do escopo.

### Diários de treino de BJJ (BJJNote, UnderHooked, BJJ Logger, Post Black Belt e outros)
- Faixa + graus, histórico de promoções, horas de treino, calendário/heatmap, sequências.
- **−** Quase todos são só BJJ, isolados (sem rede social) e muitos cobram assinatura pelas estatísticas.
- **Lição:** forte demanda por registro de evolução. **Oportunidade:** fazer isso para **várias modalidades**, de graça e conectado à comunidade.

## 3. Matriz comparativa

| Capacidade | Instagram | TikTok | Strava | ClassPass/Mindbody | Wellhub | Gestão academia | Smoothcomp | Diários BJJ | **Nosso produto** |
|---|---|---|---|---|---|---|---|---|---|
| Feed social com mídia | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| Vídeo curto | ● | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ◐ (limitado por custo) |
| Perfil profissional de professor | ◐ | ◐ | ○ | ◐ | ○ | ◐ | ○ | ○ | ● |
| Grade de aulas pública | ○ | ○ | ○ | ● | ◐ | ● | ○ | ○ | ● |
| Mapa de unidades | ◐ | ○ | ◐ | ● | ● | ○ | ○ | ○ | ● |
| Professor em várias academias | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ● |
| Graduação por modalidade | ○ | ○ | ○ | ○ | ○ | ● | ◐ | ◐ (só BJJ) | ● |
| Check-in de treino | ○ | ○ | ● | ◐ | ● | ● | ○ | ● | ● |
| Eventos/campeonatos | ◐ | ○ | ◐ | ○ | ○ | ○ | ● | ○ | ● (sem inscrição) |
| Gratuito para o usuário | ● | ● | ◐ | ◐ | ○ | ○ | ◐ | ◐ | ● |

● completo · ◐ parcial · ○ ausente

## 4. Oportunidades identificadas
1. **Ninguém junta "onde treinar" + "quem ensina" + "minha evolução" + "comunidade".** As soluções existentes cobrem só um pedaço cada.
2. **Professor itinerante** (dá aula em 3 academias) não tem uma página única com todas as grades e endereços.
3. **Jornada multi-modalidade portátil**: faixas de BJJ, kruang de Muay Thai, dan de Judô/Karatê, cordas de Capoeira, tudo num lugar, levado pelo atleta.
4. **Iniciante perdido**: "quero começar, sou iniciante, à noite, perto de mim" exige hoje pesquisar no Google Maps e mandar DM no Instagram.
5. **Calendário de eventos** fragmentado entre perfis de Instagram de federações.

## 5. Diferenciais propostos
| Diferencial | Descrição |
|---|---|
| **Página do Professor = cartão de visitas** | Grade unificada de todas as academias, mapa das unidades, credenciais, linhagem e botão "Ver aulas" |
| **"Aula experimental"** como filtro de primeira classe | O iniciante filtra aulas marcadas como aceitando iniciantes/aula experimental |
| **Jornada do Atleta** | Linha do tempo de graduações por modalidade, conquistas e marcos, com visibilidade granular |
| **Check-in honesto** | "Autodeclarado" vs. "Confirmado pelo professor", sem GPS |
| **Vínculos verificados** | Professor↔academia só aparece após aceite mútuo |
| **Assistente de descoberta local** (opcional) | Responde só com dados reais do banco, citando a aula/unidade |
| **Custo zero para todos** | Sem assinatura para estatísticas da jornada |

## 6. Anti-padrões que evitaremos
- Ranking público obrigatório entre alunos.
- Feed infinito algorítmico como tela inicial no MVP. Começamos cronológico, de quem você segue.
- Contadores de vaidade em destaque no perfil de alunos iniciantes.
- Esconder a atribuição do mapa. Pré-carregar tiles.
- "Check-in" que finge provar presença física.

## 7. Fontes
- Smoothcomp: perfil de atleta: https://support.smoothcomp.com/article/398-athlete-profile
- Smoothcomp: listas por divisão e academia: https://support.smoothcomp.com/article/52-does-smoothcomp-maintain-real-time-athlete-lists-by-division-and-by-academy
- Smoothcomp: team brackets: https://support.smoothcomp.com/article/264-creating-team-brackets
- Gymdesk Smoothcomp Connect: https://gymdesk.com/smoothcomp-connect
- Wellhub: check-in: https://support.gympass.com/hc/en-gb/articles/32507556127251-What-s-check-in-and-how-does-it-work
- Wellhub: como funciona: https://support.gympass.com/hc/en-gb/articles/12114432154003-What-s-Wellhub-and-how-does-it-work
- Canaltech: como funciona o Gympass: https://canaltech.com.br/apps/como-funciona-o-gympass/
- Zen Planner martial arts: https://zenplanner.com/?p=31220
- PushPress jiu-jitsu software: https://www.pushpress.com/landing/jiu-jitsu-management-software
- Wodify martial arts: https://www.wodify.com/solutions/martial-arts
- ClassCard: martial arts school management 2026: https://www.classcardapp.com/blog/martial-arts-school-management
- Strava, estudo de caso do feed: https://mechanics-playbook-next.pages.dev/case-studies/strava/
- Strava, guia completo: https://www.wareable.com/sport/strava-app-complete-guide-875
- Strava, recursos de trilha 2026: https://the5krunner.com/2026/06/12/strava-hiking-features-ipo/
- BJJNote: https://apps.apple.com/app/id6746068256
- UnderHooked: https://apps.apple.com/us/app/id6763711160
- Post Black Belt: https://apps.apple.com/app/id1673061463
- BJJ Logger: https://mwm.ai/apps/bjj-logger/6763979837

> Observações sobre Instagram, TikTok, YouTube, BeReal, ClassPass, Mindbody e BJJ Fanatics se baseiam na experiência pública dos produtos. Revalidar pontualmente durante a Fase 3/4 caso alguma decisão dependa de detalhe específico.
