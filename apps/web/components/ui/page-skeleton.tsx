/** Esqueleto mostrado na hora do clique enquanto a página carrega no servidor (loading.tsx). */
export function PageSkeleton({ label = "Carregando…", profile = false }: { label?: string; profile?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="animate-pulse space-y-6">
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-4">
            {profile && <div className="size-20 shrink-0 rounded-full bg-border" />}
            <div className="flex-1 space-y-3">
              <div className="h-7 w-48 rounded bg-border" />
              <div className="h-4 w-32 rounded bg-border" />
            </div>
          </div>
          <div className="mt-6 h-4 w-64 rounded bg-border" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="h-5 w-40 rounded bg-border" />
            <div className="h-4 w-11/12 rounded bg-border" />
            <div className="h-4 w-3/4 rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
