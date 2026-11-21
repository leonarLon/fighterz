import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AtSign, BadgeCheck, ExternalLink, Globe, Mail, MapPin, Newspaper, Phone, Settings, Tag } from "lucide-react";
import { BUSINESS_CATEGORY_LABELS, CATALOG_ITEM_LABELS, formatBrl, formatDate } from "@figtherz/core";
import { loadBusiness, type CatalogItem } from "@/lib/businesses";
import { loadMoreBusinessPosts } from "@/app/actions/posts";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";
import { PageBanner, PageLogo } from "@/components/media/page-banner";
import { PostList } from "@/components/post/post-list";
import { BeltDivider } from "@/components/ui/belt";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadBusiness((await params).slug);
  if (!data) return { title: "Página não encontrada" };
  return { title: data.business.name, description: data.business.description?.slice(0, 160) };
}

function priceLabel(item: CatalogItem) {
  if (item.price_status === "paid" && item.price_cents) return formatBrl(item.price_cents);
  if (item.price_status === "free") return "Gratuito";
  return "Consulte o valor";
}

// Página pública de marca, loja ou serviço. Sem login. Preços e promoções são informativos (sem pagamento aqui).
export default async function BusinessPage({ params }: Props) {
  const data = await loadBusiness((await params).slug);
  if (!data) notFound();
  const { business, items, promotions, isManager, martialArts, posts } = data;
  const viewer = await getViewer();
  const visibleItems = items.filter((i) => i.is_active);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const current = promotions.filter((p) => p.starts_on <= today && (!p.ends_on || p.ends_on >= today));

  return (
    <div className="space-y-6">
      <Card>
        <PageBanner path={business.cover_path} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <PageLogo path={business.logo_path} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">{BUSINESS_CATEGORY_LABELS[business.category]}</p>
              <h1 className="flex items-center gap-2 font-display text-3xl font-bold leading-tight lg:text-4xl">
                {business.name}
                {business.is_verified && <BadgeCheck aria-label="Página verificada" className="size-6 text-accent" />}
              </h1>
              {(business.city || martialArts.length > 0) && (
                <p className="mt-1 text-muted">
                  {[business.city ? `${business.city}${business.state ? `/${business.state}` : ""}` : null, martialArts.map((m) => m.name).join(" · ") || null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>
          {isManager && (
            <ButtonLink href={routes.manageBusiness(business.slug)} variant="secondary">
              <Settings aria-hidden className="size-4" /> Gerenciar
            </ButtonLink>
          )}
        </div>
        {business.status !== "active" && (
          <p className="mt-3 rounded-md border border-warning/40 px-3 py-2 text-[13px] font-medium text-warning">
            {business.status === "suspended" ? "Página suspensa pela moderação: só a gestão vê." : "Página oculta: só a gestão vê esta página."}
          </p>
        )}
        {business.description && <p className="mt-4 whitespace-pre-line">{business.description}</p>}

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {business.website && (
            <li>
              <a href={business.website} target="_blank" rel="noopener nofollow ugc" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                <Globe aria-hidden className="size-4" /> Site
              </a>
            </li>
          )}
          {business.instagram && (
            <li>
              <a
                href={`https://www.instagram.com/${business.instagram}`}
                target="_blank"
                rel="noopener nofollow ugc"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <AtSign aria-hidden className="size-4" /> {business.instagram}
              </a>
            </li>
          )}
          {business.contact_email && (
            <li className="inline-flex items-center gap-1.5">
              <Mail aria-hidden className="size-4 text-muted" /> {business.contact_email}
            </li>
          )}
          {business.contact_phone && (
            <li className="inline-flex items-center gap-1.5">
              <Phone aria-hidden className="size-4 text-muted" /> {business.contact_phone}
            </li>
          )}
          {business.city && (
            <li className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4 text-muted" /> {business.city}
              {business.state ? `/${business.state}` : ""}
            </li>
          )}
        </ul>
        <BeltDivider className="mt-6" />
      </Card>

      {current.length > 0 && (
        <section aria-labelledby="promocoes">
          <h2 id="promocoes" className="mb-3 font-display text-2xl font-semibold">
            Promoções
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {current.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Tag aria-hidden className="size-4 text-accent" /> {p.title}
                </p>
                {p.description && <p className="mt-1 whitespace-pre-line text-sm">{p.description}</p>}
                {p.coupon_code && (
                  <p className="mt-2 text-sm">
                    Cupom: <span className="rounded-sm border border-dashed border-border px-2 py-0.5 font-mono font-semibold">{p.coupon_code}</span>
                  </p>
                )}
                <p className="mt-2 text-[13px] text-muted">{p.ends_on ? `Válida até ${formatDate(p.ends_on)}` : "Sem data de término"}</p>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener nofollow ugc" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                    <ExternalLink aria-hidden className="size-4" /> Ver promoção
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="catalogo">
        <h2 id="catalogo" className="mb-3 font-display text-2xl font-semibold">
          Produtos e serviços
        </h2>
        {visibleItems.length === 0 ? (
          <p className="text-muted">Nenhum item no catálogo ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <li key={item.id} className="flex flex-col rounded-lg border border-border bg-surface p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{CATALOG_ITEM_LABELS[item.kind]}</p>
                <h3 className="font-semibold">{item.name}</h3>
                {item.description && <p className="mt-1 whitespace-pre-line text-sm">{item.description}</p>}
                <p className="mt-2 font-semibold">{priceLabel(item)}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener nofollow ugc" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                    <ExternalLink aria-hidden className="size-4" /> Ver no site<span className="sr-only">: {item.name}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12px] text-muted">Valores informados pela página. A compra acontece fora do Fighterz.</p>
      </section>

      <section aria-labelledby="publicacoes">
        <h2 id="publicacoes" className="mb-3 font-display text-2xl font-semibold">
          Publicações
        </h2>
        <PostList
          initial={posts}
          viewer={viewer}
          loadMore={loadMoreBusinessPosts.bind(null, business.id)}
          empty={<EmptyState icon={Newspaper} title="Nenhuma publicação" description="A página ainda não publicou." />}
        />
      </section>
    </div>
  );
}
