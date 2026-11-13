# Segurança, Moderação e LGPD

> Status: **proposta da Fase 1.** Este documento é normativo: código que viole estas regras não deve ser aceito.
> Não é aconselhamento jurídico. Antes de abrir o produto ao público, valide com profissional de direito digital.

## 1. Princípios
1. **Autorização no banco.** RLS em todas as tabelas. Esconder botão no frontend nunca é controle de acesso.
2. **Menor privilégio.** O cliente usa a chave `anon` + JWT do usuário. A `service_role` só existe no servidor e só em rotas que precisam dela.
3. **Negar por padrão.** Tabela nova nasce com RLS ativo e sem políticas, ou seja, ninguém acessa até a política ser escrita e testada.
4. **Privacidade por padrão** para dados sensíveis (localização, contato, jornada).

## 2. Autenticação
- Supabase Auth (GoTrue): e-mail + senha, confirmação de e-mail, recuperação de senha, sessão em cookie `httpOnly` via `@supabase/ssr`.
- Senha mínima de 8 caracteres, checagem contra lista local de senhas comuns (sem API externa).
- Proteção de rotas: middleware Next.js redireciona sem sessão, e o banco nega mesmo que o middleware falhe.
- Sem login social no MVP (os provedores são gratuitos, mas exigem contas externas. Pode ser avaliado depois).
- Exclusão de conta: RPC `delete_my_account` com reautenticação, apagando dados e mídias (seção 7).

## 3. Papéis e permissões
| Papel | Origem | Pode |
|---|---|---|
| Visitante | sem sessão | ver perfis públicos, academias, grades, eventos publicados |
| Usuário | conta ativa | rede social, jornada, check-in, denúncias |
| Professor | `teacher_profiles.status = approved` | perfil profissional, aulas nas academias em que tem vínculo ativo, eventos |
| Admin de academia | `academy_memberships.role in (owner, admin)` | editar academia, unidades, grade, aprovar vínculos |
| Moderador | `user_roles` | fila de denúncias, remover/restaurar conteúdo, suspender temporariamente |
| Admin | `user_roles` | tudo do moderador + modalidades, aprovações, configurações |
| Superadmin | `user_roles` | conceder/revogar papéis de plataforma |

Toda ação administrativa gera registro em `moderation_actions` ou `admin_audit_log` (append-only).

## 4. Proteções técnicas
| Ameaça | Controle |
|---|---|
| Acesso a dados de terceiros (IDOR) | RLS + testes pgTAP "A não lê/escreve dados de B" para cada tabela |
| Escalada de privilégio | Colunas sensíveis (`status`, `role`, contadores) protegidas por trigger/política de UPDATE com `WITH CHECK` |
| Spam/abuso | `check_rate_limit()` no banco: posts 20/h, comentários 60/h, follows 200/dia, denúncias 20/dia, check-ins 5/dia, geocodificação 10/h por usuário |
| XSS | React escapa por padrão. Proibido `dangerouslySetInnerHTML` com conteúdo de usuário. Links do usuário com `rel="noopener nofollow ugc"`. CSP restritiva |
| CSRF | Cookies `SameSite=Lax` + Server Actions (checagem de origem do Next) |
| Upload malicioso | Validação de MIME **e** assinatura (magic bytes), limites de tamanho no bucket, reencode de imagem no cliente (remove EXIF/GPS), nomes gerados (UUID), servir com `Content-Disposition` adequado |
| SSRF nas URLs de usuário | Servidor **não** busca URLs fornecidas por usuário. Links externos só são exibidos, e vídeo externo só por allowlist (YouTube/Vimeo) via embed |
| Vazamento de segredo | `.env*` no `.gitignore`, `.env.example` sem valores, varredura com `gitleaks` (MIT) no pre-commit |
| Mídia privada | Bucket privado + URL assinada de 60 s gerada após checagem de permissão |
| Enumeração de usuários | Mensagens genéricas em login/recuperação |
| Abuso de serviços públicos (OSM/Nominatim/ViaCEP) | Proxy no servidor, fila e cache. Ver `COST_ZERO_POLICY.md` |

Cabeçalhos: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (**não** `no-referrer`, porque a política de tiles do OSM exige Referer), `Permissions-Policy` liberando geolocalização apenas para o próprio site.

## 5. Moderação
- Denúncia de post, comentário, perfil, academia e evento, com motivos padronizados.
- **Ocultação preventiva:** conteúdo com 3+ denúncias distintas de `minor_safety`, `nudity` ou `violence` (fora de contexto esportivo) vai para `under_review` automaticamente até um moderador decidir.
- Fila priorizada: `minor_safety` primeiro.
- Bloqueio: o bloqueado não vê, não segue, não comenta, não marca e não recebe notificações do bloqueador, e os follows são removidos.
- Suspensão com prazo (`expires_at`) e motivo. O usuário vê o motivo e pode contestar (canal por e-mail no MVP).
- **Contexto do esporte:** vídeos de sparring e luta são conteúdo legítimo. As diretrizes de comunidade distinguem treino/competição de violência real ou humilhação.

## 6. Menores de idade: ⚠️ decisão pendente
O **ECA Digital (Lei 15.211/2025)** está em vigor desde **17/03/2026**. Segundo cobertura especializada:
- a autodeclaração de idade **deixa de ser suficiente**, e as plataformas devem usar mecanismos de verificação;
- contas de **menores de 16 anos** devem ficar vinculadas a um responsável legal;
- **menores de 12 anos** não podem ter conta em redes sociais;
- exige ferramentas de supervisão parental e resposta ágil a conteúdo ilícito, com fiscalização da ANPD;
- a regulamentação da verificação de idade ainda estava em definição pela ANPD no início da vigência.

**Problema de custo zero:** verificação de idade confiável normalmente depende de serviços pagos (documento + biometria).

**Recomendação para o MVP:** **somente maiores de 18 anos podem criar conta.** Menores podem aparecer apenas como *visitantes* (grades e academias públicas não exigem login).
- Data de nascimento obrigatória no cadastro + declaração.
- Denúncia `minor_safety` com prioridade máxima e remoção de contas identificadas como de menores.
- Academias podem divulgar turmas infantis (dados da aula), **sem** perfis de crianças.
- Publicações com crianças identificáveis: aviso no upload sobre consentimento do responsável e regra nas diretrizes.
- Suporte a menores (contas vinculadas a responsáveis) fica como fase futura, após revisão jurídica e regulamentação da ANPD.

Fontes: Agência Senado (https://www12.senado.leg.br/noticias/materias/2026/03/17/eca-digital-para-protecao-on-line-de-criancas-e-adolescentes-entra-em-vigor), Olhar Digital (https://olhardigital.com.br/2026/03/17/internet-e-redes-sociais/eca-digital-entra-em-vigor-nesta-terca-saiba-o-que-muda-na-internet-brasileira/), IT Forum (https://itforum.com.br/noticias/eca-digital-entra-em-vigor/), Machado Meyer (https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf).

## 7. LGPD
| Requisito | Implementação |
|---|---|
| Base legal e transparência | Termos de uso + Política de privacidade no cadastro, com aceite registrado (`terms_accepted_at`, `privacy_accepted_at`) |
| Minimização | Não coletamos CPF, documento, gênero nem telefone obrigatório. Localização do **usuário** não é armazenada (só a de **unidades/eventos**) |
| Consentimento específico | Contato público do professor (`show_contact`) |
| Acesso e portabilidade | `export_my_data()` gera JSON com todos os dados do titular + links das mídias |
| Correção | Edição de perfil e jornada |
| Eliminação | `delete_my_account()`: apaga perfil, posts, mídias do Storage, check-ins e jornada. Denúncias feitas por ele ficam anonimizadas. Registros de moderação são mantidos pelo prazo legal, sem dados pessoais além do ID |
| Retenção | Conteúdo soft-deleted é apagado fisicamente em 30 dias. Logs de 90 dias |
| Dados sensíveis | Dados de saúde/lesão **não** são coletados no MVP. Observações de treino são texto livre, privadas por padrão |
| Encarregado (DPO) | Canal de contato a definir antes da abertura pública |

## 8. Testes de segurança obrigatórios
- pgTAP: para cada tabela, testes de SELECT/INSERT/UPDATE/DELETE como anônimo, dono, outro usuário, bloqueado, moderador.
- Playwright: usuário A tenta editar post/aula/unidade de B pela UI e via chamada direta à API, e deve falhar.
- Upload: arquivo `.exe` renomeado para `.jpg`, imagem de 50 MB, vídeo de 5 min. Todos devem ser rejeitados.
- `gitleaks` no CI local.
