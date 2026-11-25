import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Info, XCircle } from "lucide-react";
import { teacherRankOptions } from "@figtherz/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { ScheduleGrid, type ScheduleItem } from "@/components/academy/schedule-grid";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InviteStudentForm, StudentLinkList, type StudentLink } from "@/components/teacher/student-links";
import { TeacherMemberships } from "./memberships";
import { PromotionRequests, type PromotionRequest } from "./promotion-requests";
import { TeacherForm, type TeacherFormValues } from "./teacher-form";

export const metadata: Metadata = { title: "Área do professor" };

export default async function TeacherAreaPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: me }, { data: arts }, { data: ranks }, { data: taught }] = await Promise.all([
    supabase.from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("martial_arts").select("id, name, has_ranks, teacher_min_ordinal").order("sort_order"),
    supabase.from("martial_art_ranks").select("id, name, martial_art_id, ordinal").eq("track", "adult").order("ordinal"),
    supabase.from("teacher_martial_arts").select("martial_art_id, rank_id").eq("teacher_id", user.id),
  ]);

  // Só as graduações que permitem ser professor (faixa preta ou equivalente); o banco confere de novo.
  const artOptions = (arts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    ranks: teacherRankOptions(
      { hasRanks: a.has_ranks, teacherMinOrdinal: a.teacher_min_ordinal },
      (ranks ?? []).filter((r) => r.martial_art_id === a.id),
    ).map((r) => ({ id: r.id, name: r.name })),
  }));
  const certs = (profile?.certifications as { title: string; issuer: string | null; year: number | null }[] | undefined) ?? [];
  const initial: TeacherFormValues = {
    professionalName: profile?.professional_name ?? "",
    bio: profile?.bio ?? "",
    experienceYears: profile?.experience_years?.toString() ?? "",
    lineage: profile?.lineage ?? "",
    accessPlans: profile?.access_plans ?? "",
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
  let requests: PromotionRequest[] = [];
  let students: StudentLink[] = [];
  if (approved) {
    const [{ data: s }, { data: m }, { data: pr }, { data: st }] = await Promise.all([
      supabase.rpc("get_teacher_schedule", { p_teacher: user.id }),
      supabase
        .from("academy_memberships")
        .select("academy_id, status, requested_by, academies(slug, name)")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .in("status", ["active", "pending"]),
      supabase
        .from("promotion_cards")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("verification", "self_reported")
        .order("created_at"),
      supabase.from("teacher_student_cards").select("*").eq("teacher_id", user.id).order("created_at").limit(500),
    ]);
    students = (st ?? []).map((l) => ({
      teacherId: l.teacher_id!,
      studentId: l.student_id!,
      status: l.status as StudentLink["status"],
      requestedBy: l.requested_by as StudentLink["requestedBy"],
      name: l.student_display_name ?? "",
      username: l.student_username ?? "",
      avatarPath: l.student_avatar_path,
    }));
    requests = (pr ?? []).map((p) => ({
      id: p.id!,
      username: p.user_username ?? "",
      displayName: p.user_display_name ?? "",
      martialArt: p.martial_art_name ?? "",
      rankName: p.rank_name ?? "",
      rankColor: p.rank_color,
      rankSecondaryColor: p.rank_secondary_color,
      degree: p.degree ?? 0,
      promotedOn: p.promoted_on!,
      academyName: p.academy_name,
    }));
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
              <BadgeCheck aria-hidden className="size-4" /> Perfil de professor ativo.
              <Link href={routes.teacher(me?.username ?? "")} className="inline-flex items-center gap-1 underline">
                Ver página pública <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            </p>
          )}
          {(profile.status === "pending" || profile.status === "rejected") && (
            <p role="status" className="flex items-start gap-2 rounded-md border border-warning/40 px-3 py-2.5 text-sm font-medium text-warning">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Perfil ainda não ativo. Para ser professor, marque pelo menos uma modalidade em que você é faixa preta (ou equivalente).
              Modalidades sem graduação, como Boxe e MMA, não exigem faixa.
            </p>
          )}
          {profile.status === "revoked" && (
            <div role="status" className="rounded-md border border-danger/40 px-3 py-2.5 text-sm text-danger">
              <p className="flex items-center gap-2 font-medium">
                <XCircle aria-hidden className="size-4" /> Perfil profissional revogado pela equipe Fighterz.
              </p>
              {profile.review_notes && <p className="mt-1">Motivo: {profile.review_notes}</p>}
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
          <section aria-labelledby="graduacoes-pendentes">
            <h2 id="graduacoes-pendentes" className="mb-3 font-display text-2xl font-semibold">
              Graduações para confirmar
            </h2>
            <PromotionRequests items={requests} />
          </section>
          <section aria-labelledby="alunos">
            <h2 id="alunos" className="font-display text-2xl font-semibold">
              Alunos
            </h2>
            <p className="mb-3 text-muted">
              {(() => {
                const n = students.filter((l) => l.status === "active").length;
                return `${n} ${n === 1 ? "aluno" : "alunos"} na sua lista. O total aparece no seu perfil; a lista só você e cada aluno veem.`;
              })()}
            </p>
            <Card className="space-y-4">
              <InviteStudentForm />
              <StudentLinkList
                key={students.map((l) => `${l.studentId}:${l.status}`).join(",")}
                side="teacher"
                items={students}
                empty={<p className="text-muted">Nenhum aluno ainda. Convide pelo @usuário ou peça para seus alunos tocarem em “Sou aluno” na sua página.</p>}
              />
            </Card>
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
            Professores ganham página própria, entram na grade das academias, têm lista de alunos e confirmam graduações.
            Basta ser faixa preta (ou equivalente) em pelo menos uma modalidade: o perfil é ativado na hora, sem fila de aprovação.
          </p>
        )}
        <TeacherForm arts={artOptions} initial={initial} isNew={!profile} />
      </Card>
    </>
  );
}
