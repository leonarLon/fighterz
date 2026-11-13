# Política de Custo Zero

> Restrição arquitetural obrigatória. Qualquer tecnologia nova precisa passar pela checagem abaixo **antes** de ser integrada.
> Última verificação das condições comerciais: **13/11/2026**. Termos de terceiros mudam. Revalide antes de cada fase de publicação.

## 1. Checklist obrigatório (por ferramenta)

| # | Pergunta | Critério de aprovação |
|---|----------|-----------------------|
| 1 | Existe plano realmente gratuito? | Sim, sem prazo de expiração |
| 2 | Exige cartão de crédito? | Não |
| 3 | Cobra por requisição ou excedente? | Não. Ao atingir o limite, o serviço **para** ou **degrada**, mas não cobra |
| 4 | Limites de armazenamento/tráfego? | Documentados aqui |
| 5 | Funcionalidade essencial exige upgrade? | Não |
| 6 | O uso pretendido é permitido pelos termos? | Sim |
| 7 | Existe alternativa open source local? | Registrar qual |

Se qualquer resposta reprovar, a ferramenta não entra. Aplique a regra de contingência (seção 5).

## 2. Ferramentas locais (desenvolvimento): aprovadas

| Ferramenta | Licença | Cartão | Observações |
|---|---|---|---|
| Node.js 24 | MIT | Não | Já instalado na máquina |
| Next.js / React | MIT | Não | |
| TypeScript | Apache-2.0 | Não | |
| Tailwind CSS | MIT | Não | |
| PostgreSQL | PostgreSQL License | Não | |
| PostGIS | GPL-2.0 | Não | Usado como extensão do banco; não distribuímos binários modificados |
| Supabase CLI + stack local | Apache-2.0 / MIT (componentes) | Não | Requer Docker |
| Docker Desktop | Proprietária, gratuita com condições | Não | Gratuito para uso pessoal, educacional, projeto open source não comercial ou empresa com **< 250 funcionários E < US$ 10 mi de receita anual**. Alternativa 100% open source: Docker Engine dentro do WSL2, ou Podman |
| WSL2 | Recurso do Windows | Não | Necessário para Docker no Windows. **Ainda não instalado** nesta máquina |
| FFmpeg | LGPL-2.1+ (GPL se compilado com x264) | Não | Usado como processo externo (CLI), sem linkagem. Não instalado ainda |
| Leaflet | BSD-2-Clause | Não | Usado direto. `react-leaflet` **não** entra (Hippocratic License 2.1, fora das licenças OSI) |
| Vitest | MIT | Não | |
| Playwright | Apache-2.0 | Não | |
| pgTAP | PostgreSQL License | Não | Testes de RLS (`supabase test db`) |
| Zod | MIT | Não | Validação compartilhada web/mobile |
| Fontes Inter e Barlow Condensed | SIL OFL 1.1 | Não | Auto-hospedadas via `next/font` |
| `@supabase/supabase-js` e `@supabase/ssr` | MIT | Não | Clientes do Supabase (sessão em cookie) |
| lucide-react | ISC | Não | Ícones de traço uniforme |
| axe-core / `@axe-core/playwright` | MPL-2.0 | Não | Só em testes (não distribuído) |

## 3. Serviços públicos gratuitos: aprovados com regras de uso

### OpenStreetMap: tiles (`tile.openstreetmap.org`)
- Gratuito, sem chave, sem cartão. **Sem SLA**. A OSMF pode bloquear uso pesado sem aviso.
- Regras que o código **deve** cumprir:
  - Atribuição "© OpenStreetMap contributors" visível no mapa, sem esconder.
  - Não remover o header `Referer` (não usar `Referrer-Policy: no-referrer` nas páginas com mapa).
  - Respeitar cache HTTP. **Proibido** pré-carregar tiles, criar "download offline" ou varrer áreas.
  - Usar a URL HTTPS exata.
- Plano B se o volume crescer: servir tiles próprios (ex.: Protomaps PMTiles, BSD/ODbL, gerados a partir do OSM e hospedados como arquivo estático).

### Nominatim (geocodificação OSM)
- Gratuito, sem chave. Regras:
  - **Máximo 1 requisição/segundo para a aplicação inteira**, somando todos os usuários.
  - User-Agent identificando a aplicação, nunca o padrão da biblioteca.
  - **Autocomplete proibido.** A busca só dispara num clique explícito ("Localizar no mapa").
  - Resultados em cache obrigatório. Proibido geocodificação em massa ou sistemática.
- Implementação: chamada **somente pelo servidor** (rota proxy), com fila de 1 req/s, cache em tabela `geocode_cache` e confirmação manual do pino pelo usuário. As coordenadas finais são as **confirmadas pelo usuário**, não as do Nominatim.

### ViaCEP (CEP → endereço)
- Gratuito, sem chave. Uso massivo pode bloquear o acesso indefinidamente.
- Implementação: consulta só quando o usuário termina de digitar um CEP completo (8 dígitos), com cache. Nunca em lote. Plano B: preenchimento manual (sempre disponível).

### Geolocalização do navegador
- API nativa, sem custo. Uso **pontual** (um clique em "perto de mim"), nunca contínuo nem em segundo plano.

## 4. Hospedagem remota: aprovadas COM RESSALVAS (exigem sua autorização)

> Nenhuma conta foi criada. Nada foi publicado.

### Supabase Free (banco, auth, storage em produção)
| Item | Limite Free |
|---|---|
| Banco | 500 MB por projeto, CPU compartilhada, 500 MB RAM |
| Storage | 1 GB |
| Egress | 5 GB + 5 GB em cache |
| Upload máximo | 50 MB por arquivo |
| Usuários ativos | 50.000 MAU |
| Projetos | 2 ativos |
| Pausa | Projeto pausado após **1 semana sem atividade** |
| Logs | 1 dia |

- **Cobrança:** a documentação de billing indica que só se cobra uso **além da cota** em planos pagos. O plano Free tem cotas fixas e não lista preço de excedente.
- **⚠️ A verificar no momento do cadastro:** fontes de terceiros divergem sobre exigência de cartão. Se o cadastro pedir cartão, o Supabase **reprova** e a produção fica no plano B (seção 6).
- **Nunca** fazer upgrade nem ativar "spend cap off".

### Vercel Hobby (hospedagem do Next.js)
- Gratuito, sem cobrança de excedente: ao atingir o limite, o recurso pausa por até 30 dias.
- Limites/mês: 100 GB de transferência, 1 M invocações, 4 h de CPU ativa, 5 mil transformações de imagem.
- **⚠️ Restrição contratual:** os Termos dizem: *"You shall only use the Services under a Hobby plan for your personal or non-commercial use."* Serve para **piloto, portfólio e testes não comerciais**. Se o produto passar a ter fins comerciais, o Vercel Hobby **deixa de ser permitido**.
- Não usar `next/image` com otimização da Vercel (5 mil transformações estoura rápido). Imagens já são otimizadas no upload (seção 7).

### Cloudflare Workers/Pages Free (alternativa de hospedagem)
- Permite uso comercial no plano Free. Limite de ~100 mil requisições/dia em funções, com CPU por requisição muito baixa (10 ms segundo fontes de terceiros, **a confirmar na documentação oficial**). Next.js via adaptador OpenNext.
- Ao estourar, as funções param até o reset diário, sem cobrança.

## 5. Regra de contingência
1. Não contratar. 2. Não trocar por API paga. 3. Não simular integração.
4. Procurar alternativa gratuita/open source. 5. Se não houver: documentar a limitação aqui e manter a funcionalidade desativada por feature flag.

## 6. Plano B de produção (se Supabase/Vercel reprovarem)
- **Auto-hospedagem**: stack Supabase self-hosted (Docker) num computador próprio, exposto via **Cloudflare Tunnel** (gratuito, sem abrir portas).
- Custo financeiro: zero. **Limitação:** a disponibilidade depende do computador ficar ligado, e há consumo de energia elétrica (custo indireto, não é serviço contratado).

## 7. Decisões de produto impostas pelo custo zero
| Restrição | Decisão |
|---|---|
| 1 GB de storage no Supabase Free | Imagens convertidas para WebP no navegador (máx. 1600 px, ~200–400 KB). Vídeos limitados a **60 s, 720p, 25 MB** |
| Sem serviço de transcodificação | FFmpeg roda localmente/self-host num worker. Na hospedagem gratuita serverless, o vídeo é validado no cliente e a thumbnail é gerada no navegador (canvas) |
| Sem CDN paga | Cache HTTP de longa duração em mídia pública e carregamento sob demanda |
| E-mail transacional | Em dev: caixa de e-mail local do Supabase (Mailpit/Inbucket). Em produção: o e-mail embutido do Supabase tem limite baixíssimo de envio por hora. SMTP gratuito a avaliar na Fase 7 (finalização) |
| Domínio próprio custa dinheiro | Usar subdomínio gratuito do provedor (ex.: `*.vercel.app`) |

## 8. Escopo removido
- **Inteligência artificial**: removida por decisão do produto em 13/11/2026 (ver `AI_ARCHITECTURE.md`).

## 9. Itens proibidos (lembrete)
OpenAI/Anthropic/Gemini API, Google Maps/Places, Mapbox pago, Cloudinary/Mux/imgix, Auth0 pago, Oracle Cloud Free (exige cartão), créditos promocionais de nuvem, trials.

## 10. Fontes
- Supabase Pricing: https://supabase.com/pricing
- Supabase Billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Vercel Terms (seção Hobby): https://vercel.com/legal/terms
- Vercel Fair Use: https://vercel.com/docs/limits/fair-use-guidelines
- OSM Tile Policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim Policy: https://operations.osmfoundation.org/policies/nominatim/
- ViaCEP: https://viacep.com.br/
- Docker Pricing FAQ: https://www.docker.com/pricing/faq/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
