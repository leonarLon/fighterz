// Fonte única das rotas usadas pelo proxy, pela navegação e pelos testes.
export const routes = {
  home: "/",
  feed: "/inicio",
  explore: "/explorar",
  publish: "/publicar",
  notifications: "/notificacoes",
  profileEdit: "/perfil",
  settings: "/configuracoes",
  saved: "/salvos",
  post: (id: string) => `/p/${id}`,
  classes: "/aulas",
  academies: "/academias",
  newAcademy: "/academias/nova",
  academy: (slug: string) => `/academias/${slug}`,
  manageAcademy: (slug: string) => `/academias/${slug}/gerenciar`,
  teacher: (username: string) => `/professores/${encodeURIComponent(username)}`,
  teacherArea: "/professor",
  adminTeachers: "/admin/professores",
  journey: "/jornada",
  newCheckin: "/jornada/treino",
  events: "/eventos",
  event: (id: string) => `/eventos/${id}`,
  newEvent: "/eventos/novo",
  editEvent: (id: string) => `/eventos/${id}/editar`,
  profile: (username: string) => `/u/${encodeURIComponent(username)}`,
  signIn: "/entrar",
  signUp: "/cadastro",
  forgotPassword: "/recuperar-senha",
  resetPassword: "/redefinir-senha",
  terms: "/termos",
  privacy: "/privacidade",
} as const;

/** Exigem sessão. O banco nega mesmo que o proxy falhe (SECURITY.md §2). */
export const PROTECTED_PREFIXES = [
  routes.feed,
  routes.explore,
  routes.publish,
  routes.notifications,
  routes.profileEdit,
  routes.settings,
  routes.saved,
  routes.teacherArea,
  routes.newAcademy,
  routes.journey,
  routes.newEvent,
  "/admin",
  routes.resetPassword,
];

/** Páginas de visitante: quem já está logado vai para o feed. */
export const GUEST_ONLY = [routes.signIn, routes.signUp, routes.forgotPassword];

export function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Aceita só caminhos internos em ?next= (evita open redirect). */
export function safeNextPath(value: string | null | undefined, fallback: string = routes.feed): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
