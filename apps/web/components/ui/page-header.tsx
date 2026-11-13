export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-[28px] font-bold leading-[1.1] lg:text-[40px]">{title}</h1>
      {description && <p className="mt-1 text-muted">{description}</p>}
    </header>
  );
}
