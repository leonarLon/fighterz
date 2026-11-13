# Plano do app móvel (Expo)

> Status: **plano da Fase 7**, não implementado. Nada aqui foi publicado nem exige conta externa ainda.
> Publicar nas lojas exige contas pagas (Apple: US$ 99/ano; Google: US$ 25 uma vez), o que **viola a política de custo zero**. Por isso o caminho recomendado começa pelo PWA e deixa as lojas para quando houver decisão e orçamento.

## 1. Decisão recomendada: PWA primeiro, Expo depois
| Etapa | O que é | Custo | Quando |
|---|---|---|---|
| **1. PWA** | Manifesto + ícones + "Adicionar à tela inicial" no site atual | R$ 0 | Logo após a publicação web |
| **2. Expo (desenvolvimento)** | App React Native rodando no Expo Go no celular do time | R$ 0 | Quando o uso móvel justificar |
| **3. Lojas** | Build com EAS e publicação na App Store / Play Store | Contas pagas | Só com autorização e orçamento |

O site já é mobile-first (barra inferior, alvos de 44 px, testes no Pixel 7), então o PWA cobre a maior parte do uso sem duplicar código.

## 2. O que já está pronto para reaproveitar
- **`packages/core`**: schemas Zod, regras de domínio (idade 18+, graus por faixa, limites de mídia, vídeo, fuso, calendário), detecção de formato por assinatura, limpeza de metadados de MP4 e tipos gerados do banco. Não depende de React DOM nem do Next.js: roda no React Native.
- **Banco e RLS**: toda permissão está no Supabase. O app usa o mesmo `@supabase/supabase-js` com a chave pública; nenhuma regra precisa ser reescrita.
- **Funções RPC** (`create_post`, `create_checkin`, `confirm_promotion`, `get_home_feed`, `search_classes`…): a lógica de negócio fica no banco, não nas Server Actions.

## 3. O que muda no app
| Área | Web hoje | Expo |
|---|---|---|
| Sessão | Cookie httpOnly via `@supabase/ssr` | `expo-secure-store` como storage do Supabase Auth |
| Navegação | App Router | Expo Router (mesmas rotas: `/inicio`, `/jornada`, `/eventos`…) |
| Imagens | Canvas → WebP | `expo-image-manipulator` (redimensiona e reencoda; remove EXIF) |
| Vídeo | `<video>` + limpeza de MP4 no navegador | `expo-video`; a mesma `stripMp4Metadata` do core |
| Mapa | Leaflet + tiles OSM | `react-native-maps` com tiles OSM (`UrlTile`), respeitando a política de uso dos tiles |
| Notificações | Realtime na página aberta | Realtime + Expo Notifications (push gratuito do Expo, avaliar limites antes) |
| Geolocalização | Navegador, só na consulta | `expo-location`, só na consulta (a posição continua não sendo gravada) |
| Server Actions | Next.js | Chamadas diretas ao Supabase (RPC/tabelas); o que hoje é Action vira função no core |

## 4. Passos
1. Extrair para o `packages/core` o que ainda vive nas Server Actions e não é específico da web (montagem de payloads, tradução de erros do banco).
2. Criar `apps/mobile` (Expo SDK atual, TypeScript, Expo Router) no mesmo monorepo.
3. Auth com e-mail e senha (mesmos templates pt-BR); deep link `figtherz://auth/confirm` para confirmação de e-mail.
4. Telas na ordem do MVP: feed, publicar (foto/vídeo), perfil, aulas perto de mim, página da academia, jornada e registro de treino.
5. Acessibilidade: `accessibilityLabel`, Dynamic Type e testes com TalkBack/VoiceOver.
6. Testes: Jest + React Native Testing Library para telas; o pgTAP já cobre as permissões.

## 5. Riscos
- **Custo das lojas** (seção 1).
- **Push**: o serviço do Expo é gratuito hoje, mas tem limites; confirmar pelo checklist do `COST_ZERO_POLICY.md` antes de usar.
- **Tiles do OSM em app**: a política exige identificação e proíbe uso pesado; com muitos usuários será preciso um provedor de tiles (pago) ou tiles próprios.
