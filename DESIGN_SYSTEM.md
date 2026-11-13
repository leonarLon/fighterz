# Design System

> Status: **proposta da Fase 1.** Os tokens abaixo viram variáveis CSS + configuração do Tailwind na Fase 2.
> Contrastes calculados pela fórmula WCAG 2.1 em 13/11/2026.

## 1. Princípios
| Valor da marca | Tradução visual |
|---|---|
| Força | Tipografia condensada pesada nos títulos, contraste alto |
| Disciplina | Grid rígido de 4 px, alinhamentos retos, pouca decoração |
| Energia | Vermelho em **ações e destaques**, não em superfícies grandes |
| Comunidade | Avatares e pessoas em primeiro plano, cards de academia com fotos reais |
| Evolução | Motivo visual da **faixa**: barra horizontal com pontas/graus, usada na jornada e nos chips de graduação |
| Profissionalismo | Superfícies neutras, espaço em branco, ícones de traço uniforme |

**Assinatura visual própria:** a "faixa" (uma barra de 4–6 px com marcadores de grau na ponta) aparece como divisor de seção, indicador de progresso e chip de graduação. O tatame inspira apenas uma textura sutil de grade no fundo do onboarding. Nenhum elemento imita marcas existentes.

## 2. Cores

### 2.1 Vermelho (marca)
| Token | Hex | Uso |
|---|---|---|
| red-50 | #FFF1F2 | fundo de destaque leve (claro) |
| red-100 | #FFE0E2 | hover de item selecionado (claro) |
| red-300 | #FF8A93 | — |
| red-400 | #FF5A66 | **texto/ícone vermelho no tema escuro** |
| red-500 | #E11D2E | **botão primário no tema escuro** |
| red-600 | #C8102E | **botão primário e texto vermelho no tema claro** |
| red-700 | #A30D25 | hover do primário (claro) |
| red-800 | #7A0A1C | — |
| red-900 | #4A0611 | fundo de destaque (escuro) |

### 2.2 Neutros
| Token | Hex |
|---|---|
| white | #FFFFFF |
| gray-50 | #F7F7F8 |
| gray-100 | #F4F4F5 |
| gray-200 | #E4E4E7 |
| gray-400 | #A1A1AA |
| gray-600 | #52525B |
| gray-800 | #27272A |
| gray-900 | #18181B |
| black-950 | #0E0E10 |

### 2.3 Semânticas
| Papel | Claro | Escuro |
|---|---|---|
| Sucesso | #15803D | #4ADE80 |
| Alerta | #B45309 | #FBBF24 |
| Erro | #B91C1C | #F87171 |
| Info | #1D4ED8 | #60A5FA |

> ⚠️ **Erro e marca são ambos vermelhos.** Regra: estado de erro **sempre** acompanha ícone + texto ("Campo obrigatório"), nunca só a cor. Botões destrutivos usam estilo *outline* com ícone, para não parecer o botão primário.

### 2.4 Tokens semânticos por tema
| Token | Claro | Escuro |
|---|---|---|
| `--bg` | #F7F7F8 | #0E0E10 |
| `--surface` | #FFFFFF | #18181B |
| `--surface-raised` | #FFFFFF + sombra | #27272A |
| `--border` | #E4E4E7 | #27272A |
| `--text` | #18181B | #F4F4F5 |
| `--text-muted` | #52525B | #A1A1AA |
| `--primary` | #C8102E | #E11D2E |
| `--primary-hover` | #A30D25 | #FF5A66 |
| `--on-primary` | #FFFFFF | #FFFFFF |
| `--accent-text` | #C8102E | #FF5A66 |
| `--focus-ring` | #C8102E | #FF5A66 |

### 2.5 Contrastes verificados (WCAG AA ≥ 4.5:1 texto, ≥ 3:1 elementos gráficos)
| Par | Razão |
|---|---|
| Branco sobre primário claro (#C8102E) | 5.88 ✅ |
| Primário claro sobre fundo #F7F7F8 | 5.50 ✅ |
| Branco sobre primário escuro (#E11D2E) | 4.75 ✅ |
| Vermelho #FF5A66 sobre fundo escuro | 6.34 ✅ |
| Vermelho #FF5A66 sobre superfície escura | 5.83 ✅ |
| Texto / texto secundário (claro) | 17.72 / 7.73 ✅ |
| Texto / texto secundário (escuro) | 17.54 / 7.52 ✅ |
| Sucesso, alerta e erro, nos dois temas | ≥ 5.02 ✅ |
| Botão primário escuro vs. fundo (não-texto) | 4.06 ✅ |

### 2.6 Cores de graduação
Faixas (branca, azul, roxa, marrom, preta, amarela, laranja, verde, cordas de capoeira etc.) são **dados**, não marca. Vêm de `martial_art_ranks.color_hex` e são sempre exibidas com **nome em texto** e borda neutra, para que a faixa branca fique visível no tema claro e a preta no escuro.

## 3. Tipografia
| Papel | Fonte | Peso | Tamanho (mobile → desktop) |
|---|---|---|---|
| Display (títulos de página) | **Barlow Condensed** (OFL) | 700 | 28 → 40 px, line-height 1.1 |
| Título de seção | Barlow Condensed | 600 | 20 → 24 px |
| Corpo | **Inter** (OFL) | 400 | 15 → 16 px, line-height 1.5 |
| Corpo forte | Inter | 600 | idem |
| Legenda / metadados | Inter | 400 | 13 px |
| Números (contadores, horários) | Inter `tabular-nums` | 600 | — |

Fontes auto-hospedadas com `next/font`, subset `latin` + `latin-ext`, `display: swap`. Texto mínimo de 13 px, e o usuário pode ampliar até 200% sem quebrar layout.

## 4. Espaçamento, forma e elevação
- Escala de 4 px: `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.
- Raios: `sm 6px` (chips), `md 10px` (inputs, botões), `lg 16px` (cards), `full` (avatares).
- Sombras só no tema claro. No escuro, a elevação é feita por superfícies mais claras (`--surface-raised`).
- Alvo de toque mínimo **44×44 px**.
- Breakpoints (mobile-first): `sm 640`, `md 768` (tablet), `lg 1024` (desktop com menu lateral), `xl 1280` (coluna lateral de sugestões).

## 5. Componentes
| Componente | Variantes | Estados obrigatórios |
|---|---|---|
| Button | primary, secondary, ghost, outline-danger, icon | default, hover, active, focus-visible, disabled, loading |
| Input / Textarea / Select | com rótulo, ajuda, erro | default, focus, erro (ícone + texto), disabled |
| Avatar | xs–xl, com anel de "professor verificado" | imagem, iniciais (fallback), carregando |
| RankChip (faixa) | por modalidade, com graus | — |
| BeltProgress | linha do tempo de graduações | vazio, parcial, completo |
| PostCard | texto, imagem, carrossel, vídeo, check-in, conquista | carregando (skeleton), erro de mídia, removido |
| MediaCarousel | até 10 itens, indicadores | swipe, teclado (←/→) |
| VideoPlayer | inline | carregando, pausado, reproduzindo, erro, "economia de dados" |
| ScheduleGrid | semana (desktop), lista por dia (mobile) | vazio, filtrado, aula pausada/cancelada |
| UnitMap | Leaflet + marcador | carregando, sem coordenadas (mostra endereço), erro de tiles |
| AcademyCard / TeacherCard | compacto, completo | — |
| EventCard | com data destacada | publicado, cancelado, finalizado |
| NotificationItem | por tipo | lida, não lida |
| EmptyState | ilustração simples + ação | — |
| Toast | sucesso, erro, info | com ação "desfazer" |
| Dialog / Sheet | sheet inferior no mobile, modal no desktop | foco preso, `Esc` fecha |
| Tabs, Skeleton, Badge, Tooltip | — | — |

## 6. Navegação
- **Mobile (< 1024 px):** barra inferior com Início · Explorar · **Publicar** (botão central em vermelho) · Notificações (badge) · Perfil. Cabeçalho com busca.
- **Desktop (≥ 1024 px):** menu lateral fixo à esquerda (mesmos destinos + Academias, Eventos, Jornada) e feed central de no máximo 640 px. A partir de 1280 px, coluna direita com sugestões e próximos eventos.
- Publicar abre um *sheet* com escolha: Post · Check-in · Conquista · Evento (se professor/academia).

## 7. Temas
- Três modos: **Claro**, **Escuro**, **Automático** (segue `prefers-color-scheme`). Padrão: Automático.
- Persistência: cookie `theme` (lido no servidor, evita "flash" na renderização) + `user_settings.theme` (sincroniza entre dispositivos após login).
- Implementação: atributo `data-theme` no `<html>` + variáveis CSS. Tailwind usa `darkMode: ['selector', '[data-theme="dark"]']`.
- Transição de tema sem animar cores de mídia. `color-scheme` definido para inputs nativos e barras de rolagem.
- Mapas: no tema escuro, os tiles OSM ficam **sem filtro** (inverter cores degrada a leitura). Só os controles do mapa seguem o tema.

## 8. Movimento e acessibilidade
- Durações de 120–200 ms, `ease-out`. `prefers-reduced-motion` desliga animações e autoplay de vídeo.
- Curtir: micro-animação de "impacto" (escala 1 → 1.2 → 1) no ícone.
- Foco visível em todos os elementos interativos (anel de 2 px `--focus-ring` + offset).
- Imagens com `alt` editável no upload. Vídeos sem som por padrão, com legendas (`<track>`) suportadas.
- Ordem de tabulação lógica, landmarks (`nav`, `main`, `aside`), skip link "Pular para o conteúdo".
- Meta: **WCAG 2.1 AA**, verificada com `@axe-core/playwright` nos testes E2E.

## 9. Voz e tom (microcopy)
Direto, respeitoso e encorajador, sem gíria excessiva. Exemplos: "Registrar treino", "Ver aulas", "Aceita aula experimental", "Você ainda não registrou treinos. Que tal começar hoje?".
