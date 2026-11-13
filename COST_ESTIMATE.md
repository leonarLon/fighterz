# Estimativa de Custos

> Meta: **R$ 0,00** em serviços, licenças e APIs, em todas as fases. Data: 13/11/2026.

## 1. Custo financeiro direto
| Item | Fase | Custo | Base |
|---|---|---|---|
| Ferramentas de desenvolvimento (Node, Next.js, Tailwind, Vitest, Playwright…) | todas | R$ 0 | Open source |
| PostgreSQL, PostGIS, Supabase local | todas | R$ 0 | Open source, local |
| Docker Desktop | 2+ | R$ 0 | Gratuito sob as condições da licença (uso pessoal ou empresa < 250 func. e < US$ 10 mi). Senão, Docker Engine/Podman no WSL |
| Mapas (Leaflet + tiles OSM) | 4+ | R$ 0 | Política de uso respeitada |
| Geocodificação (ViaCEP, Nominatim) | 4+ | R$ 0 | Sob demanda, cache, 1 req/s |
| FFmpeg | 3+ | R$ 0 | Local |
| Fontes (Inter, Barlow Condensed) | 2+ | R$ 0 | SIL OFL |
| Hospedagem piloto: Vercel Hobby + Supabase Free | 7 (opcional) | R$ 0 | Sem cobrança de excedente. **Vercel Hobby só para uso não comercial.** Exigência de cartão no Supabase a confirmar |
| Domínio próprio | — | **não incluído** | Domínios custam dinheiro. Usar subdomínio gratuito do provedor |
| **Total** | | **R$ 0,00** | |

## 2. Custos indiretos (não são serviços contratados, mas existem)
| Item | Observação |
|---|---|
| Energia elétrica | Rodar o ambiente localmente. Se houver auto-hospedagem, o PC fica ligado 24 h |
| Hardware | Já existente (i5-12400F, 32 GB, RTX 4060) |
| Tempo de manutenção | Moderação, backups manuais, atualização de dependências |
| Conexão de internet | Já existente. Em auto-hospedagem, o upload doméstico limita vídeo |

## 3. O que "custo zero" impede (e o que fica limitado)
| Limitação | Impacto | Gatilho para revisão |
|---|---|---|
| 1 GB de storage (Supabase Free) | ~2–3 mil fotos ou ~40 vídeos | 70% de uso → cota por usuário mais rígida / link externo para vídeos |
| 5 GB/mês de egress | Poucas centenas de usuários ativos com vídeo | Desativar autoplay, vídeos só sob clique |
| Projeto pausa após 7 dias inativo | Piloto pode "dormir" | Aceitável em teste |
| Sem SLA em OSM/Nominatim | Mapa pode falhar | Fallback em lista de endereços |
| Sem verificação de idade paga | MVP restrito a 18+ | Regulamentação ANPD / solução open source |
| Vercel Hobby não comercial | Não pode monetizar no Hobby | Migrar para Cloudflare Free ou auto-hospedagem |

## 4. Regra de ouro
Se algum painel pedir cartão, oferecer "upgrade" ou "trial", **parar e não aceitar**. Registrar em `COST_ZERO_POLICY.md` e aplicar a regra de contingência.
