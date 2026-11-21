# Relatório final: evolução comercial do Fighterz (21–22/11/2026)

> Plano e decisões em `PLANO_EVOLUCAO_COMERCIAL.md`. Rastreabilidade completa em `TEST_MATRIX.md`. Tudo publicado em https://fighterz-mu.vercel.app, uma fase por vez, com autorização para cada migration remota.

## 1. Resumo

O projeto existente foi evoluído, sem reescrita, em 6 entregas publicadas:

| Fase | Entrega | Migration | Commit |
|---|---|---|---|
| 3 | Correção do bug de graduação (atual = maior faixa e grau) e correção de registros | 20 | `1b5d1d9` |
| 4 | TotalPass, Wellhub e diária por unidade; professor cita planos aceitos onde dá aula | 21 | `eb2553f` |
| 5 | Perfil comercial de academia (logo, banner, galeria) e páginas de marca, loja e serviço | 22–23 | `2a7fabb` |
| 6 | Planos e assinaturas administrados pela equipe; professores continuam gratuitos | 24 | `ac98fdd` |
| 7 | Detecção de publicidade em perfis pessoais, com revisão humana e recurso | 25 | `69db72c` |
| 8 | Painel admin integrado (páginas na moderação, selo, números, histórico) | 26 | `ac3a7f8` |
| 9–10 | Cobertura, regressão completa, documentação e este relatório | — | `e9abbf8` |
| Pós | Seguir páginas comerciais, foto nos itens do catálogo, análise única dos posts antigos | 27 | ver git log |

Regras do projeto mantidas em todas as fases: custo zero (nenhum serviço pago; a única dependência nova é `@vitest/coverage-v8`, MIT e local), sem IA, permissões no banco (RLS e funções), 18+, e autorização antes de qualquer mudança remota.

## 2. O que mudou para cada público

**Alunos e atletas**
- A graduação atual passa a ser a maior faixa e grau registrados, não a data mais recente. Registros podem ser corrigidos e a mensagem diz qual ficou como atual.
- Nas academias, cada unidade mostra se aceita TotalPass e Wellhub (planos, modalidades, horários, restrições) e como funciona a diária: paga com valor, gratuita ou "valor não divulgado". Nenhum preço é inventado.
- O diretório "Marcas, lojas e serviços" é separado dos perfis pessoais.

**Professores**
- Continuam 100% gratuitos. Um teste confere que nenhuma regra de acesso das tabelas de professor depende de plano.
- Novo campo opcional "Planos aceitos onde dou aula" no perfil profissional. Esse campo não conta como propaganda.

**Academias**
- A gestão (dono e admins) informa TotalPass, Wellhub e diária por unidade.
- Logo, banner e galeria de fotos com legenda. O limite padrão é de 12 fotos, ampliável por plano.
- Cartão "Plano" na gestão, com plano atual, situação, validade e limites.

**Marcas, lojas e serviços**
- Página própria com dono e administradores convidados, que precisam aceitar o convite.
- Catálogo com preço pago, gratuito ou não divulgado, e link externo. A compra acontece fora do Fighterz.
- Promoções com cupom e datas. O público vê só as vigentes.
- "Publicar como página": o post aparece com a página e sai do perfil pessoal. O autor continua responsável.

**Equipe (moderação e admin)**
- **Planos e Assinaturas** (só admin): criar planos com benefícios; associar, suspender, reativar, renovar e cancelar assinaturas, com motivo. O histórico não pode ser alterado. A expiração é automática e diária.
- **Publicidade** (moderação): fila de perfis pessoais com risco a partir de 60, com cada motivo e o trecho que o gerou. As decisões possíveis são arquivar, avisar ou remover posts. A pessoa vê os motivos em /revisoes e pode recorrer, e um recurso aceito restaura os posts.
- **Páginas** (moderação; selo só pelo admin): denúncia de página, suspensão e reativação, e selo de verificada.
- A visão geral ganhou números comerciais, e o histórico ficou legível.

## 3. Decisões e garantias

- **Graduação atual:** o critério é maior faixa e grau, decisão do usuário. Faixas não regridem e o histórico fica intacto.
- **Páginas comerciais** são entidades separadas do perfil pessoal, como as academias (decisão do usuário).
- **Pagamentos:** a plataforma não processa nenhum. O preço do plano é texto de referência e a ativação é manual pelo admin.
- **Benefícios conferidos no banco:** `entitlement()` alimenta os limites. A interface só esconde o que o banco já nega.
- **Detecção sem IA:**
  - **Regras públicas:** link de loja ou WhatsApp, cupom, preço, chamada de venda e contato para venda. Contexto de treino reduz a pontuação.
  - **Fora de propósito:** "promoção" (no esporte, quer dizer graduação) e "vendo" (verbo ver).
  - **Onde roda:** num trigger diferido no banco; o core tem um espelho com os mesmos casos de teste.
  - **Sem punição automática:** um único post de venda não abre revisão, e a equipe nunca entra na fila.
- **Destaque pago:** aparece primeiro na listagem, sempre marcado como "Em destaque".
- **Histórico imutável:** `subscription_events` e `moderation_actions` são append-only.

## 4. Defeitos encontrados pelos testes e corrigidos

| Defeito | Impacto | Correção |
|---|---|---|
| Graduação atual pela data mais recente | Quem registrava uma faixa antiga ficava com a graduação errada | Migration 20 + recálculo para todos |
| Caixas de marcar controladas voltavam ao padrão após erro de validação | "Oferece diária" salvo como "não oferece", sem aviso; o mesmo acontecia no check-in e no professor | Valor do estado enviado em campo oculto |
| Selects voltavam à opção inicial após erro de validação | Dia ou nível da aula, campos da jornada, estado no perfil e público do plano salvos errados | `SelectField` recria o select quando o valor padrão muda (vale para o site inteiro) |
| Recurso não aparecia para a pessoa | Relação um-para-um vinha como objeto | Leitura aceita objeto ou lista |

## 5. Verificações finais (22/11/2026, ambiente local)

| Verificação | Resultado |
|---|---|
| pgTAP (banco, RLS, regras) | **545** testes, 26 arquivos, todos passando (eram 349 antes da evolução) |
| Vitest | **95** (core 92 + web 3) |
| Cobertura do core (`npm run test:coverage -w @figtherz/core`) | **94,5% instruções · 87,4% desvios · 92,3% funções · 96,0% linhas** |
| Playwright (desktop + Pixel 7, axe nas telas novas) | **141** passando + 27 pulados de propósito (fluxos de gestão só no desktop) |
| typecheck, lint, `next build` | verdes |

Sobre a cobertura: ela mede as regras de negócio do `packages/core`. As regras do banco têm cobertura própria no pgTAP, e os testes de ponta a ponta não geram cobertura de linha, como o plano previa.

## 6. Estado da produção

- **Migrations 19 a 26** aplicadas no projeto Supabase `wdntjflsjzgkdktemrdo`, sempre com dry-run antes.
- **Rotinas diárias no pg_cron:** `expire-subscriptions` às 3h15 UTC e `refresh-commercial-risk` às 3h30 UTC, além das que já existiam.
- **Dados de demonstração** criados a pedido do usuário:
  - TotalPass, Wellhub e diária na Tatame Central e na Equipe Raiz;
  - planos aceitos no perfil do professor Diego Ramos;
  - as páginas "Kimonos Tatame Forte" e "Fisio Luta";
  - os planos "Academia Destaque" e "Página Pro", com assinaturas;
  - o caso de publicidade do atleta24.
- **Contas para testar:** veja a tabela no `README.md`. Admin e moderador usam a senha privada da produção.

## 7. Limitações conhecidas e próximos passos sugeridos

1. ~~Foto nos itens do catálogo~~ e ~~seguir página comercial~~: feitos depois do relatório (migration 27). Métricas de página continuam fora, e nenhum benefício de plano promete isso.
2. ~~Detecção retroativa~~: os posts pessoais dos últimos 30 dias foram analisados uma vez na migration 27. Posts mais antigos não contam para o risco, que usa uma janela de 30 dias.
4. **Imagens não são analisadas** pela detecção (custo zero e sem IA). Só o texto conta.
5. **Uso comercial na Vercel Hobby:** os termos proíbem uso comercial no plano gratuito. Se os planos passarem a ser cobrados, mesmo fora da plataforma, será preciso trocar a hospedagem antes (`COST_ZERO_POLICY.md`).
6. **Storage gratuito de 1 GB:** acompanhar o uso conforme galerias e logos crescerem. Os limites por plano ajudam a controlar.
7. **Cobertura do `apps/web`:** a lógica das telas está nos testes de ponta a ponta. Se o app crescer, vale extrair mais regras para o core, onde a cobertura é medida.
