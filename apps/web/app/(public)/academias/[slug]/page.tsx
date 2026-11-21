import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, BadgeCheck, Globe, Mail, MapPin, Phone, Settings } from "lucide-react";
import { MEMBERSHIP_ROLE_LABELS, compactCount, formatAddress } from "@figtherz/core";
import { loadAcademy } from "@/lib/academies";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { AddressActions } from "@/components/academy/address-actions";
import { ScheduleGrid } from "@/components/academy/schedule-grid";
import { UnitAccessInfo } from "@/components/academy/unit-access-info";
import { LeafletMap } from "@/components/map/map";
import { Avatar } from "@/components/ui/avatar";
import { BeltDivider } from "@/components/ui/belt";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportButton } from "@/components/report/report-button";
import { AcademyActions } from "./academy-actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadAcademy((await params).slug);
  if (!data) return { title: "Academia não encontrada" };
  return { title: data.academy.name, description: data.academy.description?.slice(0, 160) };
}

// Página pública da academia: modalidades, grade, unidades com mapa e rota, professores. Sem login.
export default async function AcademyPage({ params }: Props) {
  const data = await loadAcademy((await params).slug);
  if (!data) notFound();
  const { academy, units, classes, members, martialArts, isManager, viewerId } = data;

  let isApprovedTeacher = false;
  if (viewerId) {
    const { data: approved } = await (await createClient()).rpc("is_approved_teacher", { p_user: viewerId });
    isApprovedTeacher = Boolean(approved);
  }

  const visibleUnits = units.filter((u) => u.is_active);
  const teachers = members.filter((m) => m.role === "teacher" && m.status === "active");
  const markers = visibleUnits
    .filter((u) => u.latitude != null && u.longitude != null)
    .map((u) => ({ id: u.id, lat: u.latitude!, lng: u.longitude!, title: `${academy.name} · ${u.name}`, subtitle: formatAddress(u) }));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold leading-tight lg:text-4xl">
              {academy.name}
              {academy.is_verified && <BadgeCheck aria-label="Academia verificada" className="size-6 text-accent" />}
            </h1>
            <p className="mt-1 text-muted">
              {martialArts.map((m) => m.name).join(" · ") || "Artes marciais"} · {compactCount(academy.follower_count)} seguidores
            </p>
          </div>
          {isManager && (
            <ButtonLink href={routes.manageAcademy(academy.slug)} variant="secondary">
              <Settings aria-hidden className="size-4" /> Gerenciar
            </ButtonLink>
          )}
        </div>
        {academy.status !== "active" && (
          <p className="mt-3 rounded-md border border-warning/40 px-3 py-2 text-[13px] font-medium text-warning">
            Academia oculta: só a gestão vê esta página.
          </p>
        )}
        {academy.description && <p className="mt-4 whitespace-pre-line">{academy.description}</p>}

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {academy.website && (
            <li>
              <a href={academy.website} target="_blank" rel="noopener nofollow ugc" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                <Globe aria-hidden className="size-4" /> Site
              </a>
            </li>
          )}
          {academy.instagram && (
            <li>
              <a
                href={`https://www.instagram.com/${academy.instagram}`}
                target="_blank"
                rel="noopener nofollow ugc"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <AtSign aria-hidden className="size-4" /> {academy.instagram}
              </a>
            </li>
          )}
          {academy.contact_email && (
            <li className="inline-flex items-center gap-1.5">
              <Mail aria-hidden className="size-4 text-muted" /> {academy.contact_email}
            </li>
          )}
          {academy.contact_phone && (
            <li className="inline-flex items-center gap-1.5">
              <Phone aria-hidden className="size-4 text-muted" /> {academy.contact_phone}
            </li>
          )}
        </ul>

        <div className="mt-5">
          {viewerId ? (
            <AcademyActions
              academyId={academy.id}
              following={data.following}
              memberships={data.myMemberships}
              isApprovedTeacher={isApprovedTeacher}
            />
          ) : (
            <ButtonLink href={`${routes.signIn}?next=${encodeURIComponent(routes.academy(academy.slug))}`}>
              Entrar para seguir
            </ButtonLink>
          )}
          {!isManager && (
            <div className="mt-2">
              <ReportButton
                targetType="academy"
                targetId={academy.id}
                title="Denunciar academia"
                loggedIn={Boolean(viewerId)}
                returnTo={routes.academy(academy.slug)}
              />
            </div>
          )}
        </div>
        <BeltDivider className="mt-6" />
      </Card>

      <section aria-labelledby="grade">
        <h2 id="grade" className="mb-3 font-display text-2xl font-semibold">
          Grade de aulas
        </h2>
        <ScheduleGrid items={classes.filter((c) => isManager || c.status !== "cancelled")} />
      </section>

      <section aria-labelledby="unidades">
        <h2 id="unidades" className="mb-3 font-display text-2xl font-semibold">
          {visibleUnits.length > 1 ? "Unidades" : "Onde fica"}
        </h2>
        {markers.length > 0 && <LeafletMap markers={markers} label={`Mapa das unidades da ${academy.name}`} className="mb-4 h-72" />}
        <ul className="space-y-3">
          {visibleUnits.map((unit) => (
            <li key={unit.id}>
              <Card className="p-4 sm:p-4">
                <h3 className="font-semibold">{unit.name}</h3>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {formatAddress(unit)}
                    {unit.reference_point ? <><br />Referência: {unit.reference_point}</> : null}
                  </span>
                </p>
                <div className="mt-3">
                  <AddressActions address={unit} name={`${academy.name} · ${unit.name}`} />
                </div>
                <UnitAccessInfo items={data.access.filter((a) => a.unit_id === unit.id)} arts={martialArts} />
              </Card>
            </li>
          ))}
          {visibleUnits.length === 0 && <p className="text-muted">Endereço ainda não cadastrado.</p>}
        </ul>
      </section>

      <section aria-labelledby="professores">
        <h2 id="professores" className="mb-3 font-display text-2xl font-semibold">
          Professores
        </h2>
        {teachers.length === 0 ? (
          <p className="text-muted">Nenhum professor vinculado ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {teachers.map((t) => (
              <li key={t.userId}>
                <Link href={routes.teacher(t.username)} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:bg-bg">
                  <Avatar name={t.displayName} path={t.avatarPath} size="sm" />
                  <span>
                    <span className="block font-semibold">{t.displayName}</span>
                    <span className="block text-[13px] text-muted">{MEMBERSHIP_ROLE_LABELS.teacher}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
