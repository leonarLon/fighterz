import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, ExternalLink, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { ScheduleGrid, type ScheduleItem } from "@/components/academy/schedule-grid";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TeacherMemberships } from "./memberships";
import { TeacherForm, type TeacherFormValues } from "./teacher-form";

export const metadata: Metadata = { title: "Área do professor" };

export default async function TeacherAreaPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: me }, { data: arts }, { data: ranks }, { data: taught }] = await Promise.all([
    supabase.from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("martial_arts").select("id, name").order("sort_order"),
    supabase.from("martial_art_ranks").select("id, name, martial_art_id, ordinal").eq("track", "adult").order("ordinal"),
    supabase.from("teacher_martial_arts").select("martial_art_id, rank_id").eq("teacher_id", user.id),
  ]);

  const artOptions = (arts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    ranks: (ranks ?? []).filter((r) => r.martial_art_id === a.id).map((r) => ({ id: r.id, name: r.name })),
  }));
  const certs = (profile?.certifications as { title: string; issuer: string | null; year: number | null }[] | undefined) ?? [];
  const initial: TeacherFormValues = {
    professionalName: profile?.professional_name ?? "",
    bio: profile?.bio ?? "",
    experienceYears: profile?.experience_years?.toString() ?? "",
    lineage: profile?.lineage ?? "",
    certifications: certs.map((c) => [c.title, c.issuer, c.year].filter(Boolean).join(" — ")).join("\n"),
    contactEmail: profile?.contact_email ?? "",
    contactPhone: profile?.contact_phone ?? "",
    showContact: profile?.show_contact ?? false,
    socialLinks: ((profile?.social_links as string[] | undefined) ?? []).join("\n"),
    arts: Object.fromEntries((taught ?? []).map((t) => [t.martial_art_id, t.rank_id ?? ""])),
  };

  const approved = profile?.status === "approved";
  let schedule: ScheduleItem[] = [];
  let memberships: { academyId: string; slug: string; name: string; status: string; requestedBy: string }[] = [];
  if (approved) {
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.rpc("get_teacher_schedule", { p_teacher: user.id }),
      supabase
        .from("academy_memberships")
        .select("academy_id, status, requested_by, academies(slug, name)")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .in("status", ["active", "pending"]),
    ]);
    schedule = (s ?? []) as unknown as ScheduleItem[];
    memberships = (m ?? []).map((row) => {
      const academy = row.academies as unknown as { slug: string; name: string };
      return { academyId: row.academy_id, slug: academy.slug, name: academy.name, status: row.status, requestedBy: row.requested_by };
    });
  }

  return (
    <>
      <PageHeader title="Área do professor" description="Perfil profissional, vínculos com academias e sua grade em um só lugar." />

      {profile && (
        <div className="mb-6">
          {profile.status === "approved" && (
            <p role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-success/40 px-3 py-2.5 text-sm font-medium text-success">
              <BadgeCheck aria-hidden className="size-4" /> Perfil profissional aprovado.
              <Link href={routes.teacher(me?.username ?? "")} className="inline-flex items-center gap-1 underline">
                Ver página pública <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            </p>
          )}
          {profile.status === "pending" && (
            <p role="status" className="flex items-center gap-2 rounded-md border border-warning/40 px-3 py-2.5 text-sm font-medium text-warning">
              <Clock aria-hidden className="size-4" /> Pedido em análise por um administrador.
            </p>
          )}
          {(profile.status === "rejected" || profile.status === "revoked") && (
            <div role="status" className="rounded-md border border-danger/40 px-3 py-2.5 text-sm text-danger">
              <p className="flex items-center gap-2 font-medium">
                <XCircle aria-hidden className="size-4" />
                {profile.status === "rejected" ? "Pedido recusado." : "Perfil profissional revogado."}
              </p>
              {profile.review_notes && <p className="mt-1">Motivo: {profile.review_notes}</p>}
              {profile.status === "rejected" && <p className="mt-1">Ajuste as informações e salve para reenviar.</p>}
            </div>
          )}
        </div>
      )}

      {approved && (
        <div className="mb-6 space-y-6">
          <section aria-labelledby="minha-grade">
            <h2 id="minha-grade" className="mb-3 font-display text-2xl font-semibold">
              Minha grade
            </h2>
            <ScheduleGrid items={schedule} showAcademy />
          </section>
          <section aria-labelledby="vinculos">
            <h2 id="vinculos" className="mb-3 font-display text-2xl font-semibold">
              Academias
            </h2>
            <TeacherMemberships userId={user.id} items={memberships} />
          </section>
        </div>
      )}

      <Card>
        <h2 className="mb-1 font-display text-2xl font-semibold">{profile ? "Perfil profissional" : "Quero ser professor"}</h2>
        {!profile && (
          <p className="mb-4 text-muted">
            Professores aprovados ganham página própria, entram na grade das academias e mostram todas as aulas num só lugar.
          </p>
        )}
        <TeacherForm arts={artOptions} initial={initial} isNew={!profile} />
      </Card>
    </>
  );
}
