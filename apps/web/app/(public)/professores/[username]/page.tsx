import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ExternalLink, GraduationCap, Mail, Phone, Ticket } from "lucide-react";
import { compactCount, formatAddress } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { ScheduleGrid, type ScheduleItem } from "@/components/academy/schedule-grid";
import { LeafletMap } from "@/components/map/map";
import { Avatar } from "@/components/ui/avatar";
import { BeltDivider } from "@/components/ui/belt";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StudentRequestButton } from "@/components/teacher/student-links";
import { getViewer } from "@/lib/viewer";

type Props = { params: Promise<{ username: string }> };

async function loadTeacher(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_cards").select("*").eq("username", decodeURIComponent(username).toLowerCase()).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const teacher = await loadTeacher((await params).username);
  return { title: teacher ? `${teacher.professional_name} · Professor` : "Professor não encontrado" };
}

// Perfil profissional com a grade unificada de todas as academias (aceite da Fase 4). Público.
export default async function TeacherPage({ params }: Props) {
  const teacher = await loadTeacher((await params).username);
  if (!teacher || !teacher.user_id) notFound();
  const supabase = await createClient();
  const viewer = await getViewer();
  const [{ data: schedule }, { data: link }] = await Promise.all([
    supabase.rpc("get_teacher_schedule", { p_teacher: teacher.user_id }),
    viewer && viewer.id !== teacher.user_id
      ? supabase.from("teacher_students").select("status, requested_by").eq("teacher_id", teacher.user_id).eq("student_id", viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const studentState = !viewer
    ? "anon"
    : viewer.id === teacher.user_id
      ? "self"
      : !link
        ? "none"
        : link.status === "active"
          ? "active"
          : link.requested_by === "teacher"
            ? "invited"
            : "pending";
  const studentCount = teacher.student_count ?? 0;
  const classes = schedule ?? [];

  const academies = new Map<string, { slug: string; name: string }>();
  const markers = new Map<string, { id: string; lat: number; lng: number; title: string; subtitle: string; href: string }>();
  for (const c of classes) {
    academies.set(c.academy_id, { slug: c.academy_slug, name: c.academy_name });
    if (c.latitude != null && c.longitude != null && !markers.has(c.unit_id)) {
      markers.set(c.unit_id, {
        id: c.unit_id,
        lat: c.latitude,
        lng: c.longitude,
        title: `${c.academy_name} · ${c.unit_name}`,
        subtitle: formatAddress({ ...c, postal_code: null }),
        href: routes.academy(c.academy_slug),
      });
    }
  }
  const arts = (teacher.martial_arts as { martial_art: string; rank: string | null }[]) ?? [];
  const certifications = (teacher.certifications as { title: string; issuer: string | null; year: number | null }[]) ?? [];
  const links = (teacher.social_links as string[]) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={teacher.professional_name ?? ""} path={teacher.avatar_path} size="lg" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Professor</p>
            <h1 className="font-display text-3xl font-bold leading-tight">{teacher.professional_name}</h1>
            <p className="text-muted">
              <Link href={routes.profile(teacher.username ?? "")} className="hover:underline">
                @{teacher.username}
              </Link>
              {teacher.experience_years != null && ` · ${teacher.experience_years} anos de experiência`}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
              <GraduationCap aria-hidden className="size-4 text-accent" />
              <span className="font-semibold tabular-nums">{compactCount(studentCount)}</span>
              <span className="text-muted">{studentCount === 1 ? "aluno" : "alunos"}</span>
            </p>
          </div>
        </div>
        {arts.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {arts.map((a) => (
              <li key={a.martial_art} className="rounded-sm border border-border px-2 py-1 text-sm">
                <span className="font-semibold">{a.martial_art}</span>
                {a.rank && <span className="text-muted"> · {a.rank}</span>}
              </li>
            ))}
          </ul>
        )}
        {teacher.bio && <p className="mt-4 whitespace-pre-line">{teacher.bio}</p>}
        {teacher.lineage && <p className="mt-2 text-sm text-muted">Linhagem: {teacher.lineage}</p>}
        {teacher.access_plans && (
          <p className="mt-3 flex items-start gap-1.5 text-sm">
            <Ticket aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="whitespace-pre-line">
              <span className="font-semibold">Planos aceitos onde dá aula: </span>
              {teacher.access_plans}
            </span>
          </p>
        )}

        {certifications.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {certifications.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Award aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  {c.title}
                  {c.issuer ? ` · ${c.issuer}` : ""}
                  {c.year ? ` (${c.year})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {(teacher.contact_email || teacher.contact_phone || links.length > 0) && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {teacher.contact_email && (
              <li className="inline-flex items-center gap-1.5">
                <Mail aria-hidden className="size-4 text-muted" /> {teacher.contact_email}
              </li>
            )}
            {teacher.contact_phone && (
              <li className="inline-flex items-center gap-1.5">
                <Phone aria-hidden className="size-4 text-muted" /> {teacher.contact_phone}
              </li>
            )}
            {links.map((href) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener nofollow ugc" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                  <ExternalLink aria-hidden className="size-4" /> {new URL(href).hostname.replace(/^www\./, "")}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <StudentRequestButton
            teacherId={teacher.user_id}
            teacherName={teacher.professional_name ?? ""}
            viewerId={viewer?.id ?? null}
            initial={studentState}
            signInHref={`${routes.signIn}?next=${encodeURIComponent(routes.teacher(teacher.username ?? ""))}`}
          />
        </div>
        <BeltDivider className="mt-6" />
      </Card>

      <section aria-labelledby="grade-unificada">
        <h2 id="grade-unificada" className="font-display text-2xl font-semibold">
          Grade unificada
        </h2>
        <p className="mb-3 text-muted">
          {academies.size > 0
            ? `Aulas em ${academies.size} ${academies.size === 1 ? "academia" : "academias"}: ${[...academies.values()].map((a) => a.name).join(", ")}.`
            : "Ainda sem aulas cadastradas nas academias."}
        </p>
        <ScheduleGrid items={classes as unknown as ScheduleItem[]} showAcademy />
      </section>

      {markers.size > 0 && (
        <section aria-labelledby="onde">
          <h2 id="onde" className="mb-3 font-display text-2xl font-semibold">
            Onde dá aula
          </h2>
          <LeafletMap markers={[...markers.values()]} label={`Mapa das academias de ${teacher.professional_name}`} className="h-72" />
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...academies.values()].map((a) => (
              <li key={a.slug}>
                <ButtonLink href={routes.academy(a.slug)} variant="secondary">
                  {a.name}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
