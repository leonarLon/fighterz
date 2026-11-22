import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, Dumbbell, GraduationCap, Medal, Pencil, Plus, Trophy } from "lucide-react";
import {
  ACHIEVEMENT_TYPE_LABELS,
  MEDAL_LABELS,
  formatDate,
  formatDateTime,
  formatMonth,
  localDay,
  monthGrid,
  placementLabel,
  shiftMonth,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  type AchievementType,
  type Medal as MedalKind,
} from "@figtherz/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";
import { RankBelt } from "@/components/journey/rank-belt";
import { StudentLinkList, type StudentLink } from "@/components/teacher/student-links";
import { AddArtForm, AchievementForm, PromotionForm } from "./forms";
import { DeleteButton } from "./delete-button";

export const metadata: Metadata = { title: "Minha jornada" };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ mes?: string; treino?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const currentMonth = localDay(new Date().toISOString()).slice(0, 7);
  const month = params.mes && MONTH.test(params.mes) ? params.mes : currentMonth;
  // Janela folgada (±1 dia) para cobrir o fuso; o agrupamento por dia é feito no horário de Brasília.
  const from = new Date(`${shiftMonth(month, 0)}-01T00:00:00-03:00`);
  const to = new Date(`${shiftMonth(month, 1)}-01T00:00:00-03:00`);

  const supabase = await createClient();
  const [
    { data: journey },
    { data: promotions },
    { data: arts },
    { data: ranks },
    { data: memberships },
    { data: achievements },
    { data: monthCheckins },
    { data: recent },
    { data: teacherLinks },
  ] = await Promise.all([
    supabase.from("journey_cards").select("*").eq("user_id", user.id).order("sort_order"),
    supabase.from("promotion_cards").select("*").eq("user_id", user.id).order("promoted_on", { ascending: false }),
    supabase.from("martial_arts").select("id, name, has_ranks").order("sort_order"),
    supabase.from("martial_art_ranks").select("id, name, martial_art_id, ordinal, max_degrees").eq("track", "adult").order("ordinal"),
    supabase.from("academy_memberships").select("academy_id, academies(name)").eq("user_id", user.id).eq("status", "active"),
    supabase.from("athlete_achievements").select("*, martial_arts(name)").eq("user_id", user.id).order("achieved_on", { ascending: false }),
    supabase
      .from("training_checkins")
      .select("trained_at")
      .eq("user_id", user.id)
      .gte("trained_at", from.toISOString())
      .lt("trained_at", to.toISOString()),
    supabase.from("checkin_cards").select("*").eq("user_id", user.id).order("trained_at", { ascending: false }).limit(10),
    supabase.from("teacher_student_cards").select("*").eq("student_id", user.id).order("created_at").limit(100),
  ]);
  const teachers: StudentLink[] = (teacherLinks ?? []).map((l) => ({
    teacherId: l.teacher_id!,
    studentId: l.student_id!,
    status: l.status as StudentLink["status"],
    requestedBy: l.requested_by as StudentLink["requestedBy"],
    name: l.teacher_name ?? "",
    username: l.teacher_username ?? "",
    avatarPath: l.teacher_avatar_path,
  }));
  const teacherOptions = teachers
    .filter((t) => t.status === "active")
    .map((t) => ({ id: t.username, name: `${t.name} (@${t.username})` }));

  const academies = (memberships ?? []).map((m) => ({
    id: m.academy_id,
    name: (m.academies as unknown as { name: string } | null)?.name ?? "",
  }));
  const usedArts = new Set((journey ?? []).map((j) => j.martial_art_id));
  const weeks = monthGrid(month, (monthCheckins ?? []).map((c) => localDay(c.trained_at)));
  const monthTotal = weeks.flat().reduce((sum, d) => sum + (d.inMonth ? d.count : 0), 0);

  return (
    <>
      <PageHeader title="Minha jornada" description="Graduações, treinos e conquistas. Você escolhe quem vê cada parte em Configurações." />
      {params.treino === "registrado" && (
        <div className="mb-4">
          <FormMessage status="success" message="Treino registrado." />
        </div>
      )}

      <div className="space-y-8">
        {/* ------------------------------------------------ graduações */}
        <section aria-labelledby="graduacoes">
          <h2 id="graduacoes" className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
            <Medal aria-hidden className="size-6 text-accent" /> Modalidades e graduações
          </h2>
          {(journey ?? []).length === 0 && (
            <p className="mb-4 text-muted">Adicione a modalidade que você treina para registrar faixa, graus e o histórico.</p>
          )}
          <div className="space-y-4">
            {(journey ?? []).map((j) => {
              const history = (promotions ?? []).filter((p) => p.user_martial_art_id === j.id);
              const artRanks = (ranks ?? []).filter((r) => r.martial_art_id === j.martial_art_id);
              return (
                <Card key={j.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl font-semibold">{j.martial_art_name}</h3>
                      <p className="text-[13px] text-muted">
                        {j.started_on ? `Desde ${formatDate(j.started_on)}` : "Início não informado"}
                        {j.federation ? ` · ${j.federation}` : ""}
                      </p>
                    </div>
                    <DeleteButton kind="art" id={j.id!} label={`Remover ${j.martial_art_name} da jornada`} />
                  </div>
                  {j.has_ranks && (
                    <div className="mt-3">
                      <p className="mb-1 text-[13px] font-semibold text-muted">{j.rank_name ? "Graduação atual (a maior registrada)" : "Nenhuma graduação registrada"}</p>
                      <RankBelt
                        name={j.rank_name}
                        color={j.rank_color}
                        secondaryColor={j.rank_secondary_color}
                        degree={j.current_degree}
                        confirmed={j.current_confirmed ?? false}
                      />
                    </div>
                  )}

                  {history.length > 0 && (
                    <>
                      <h4 className="mt-4 text-sm font-semibold">Histórico</h4>
                      <ol className="mt-2 divide-y divide-border rounded-md border border-border">
                        {history.map((p) => (
                          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <div className="min-w-0">
                              <RankBelt name={p.rank_name} color={p.rank_color} secondaryColor={p.rank_secondary_color} degree={p.degree} />
                              <p className="mt-1 text-[13px] text-muted">
                                {formatDate(p.promoted_on!)}
                                {p.academy_name ? ` · ${p.academy_name}` : ""}
                                {p.verification === "teacher_confirmed"
                                  ? ` · confirmada por @${p.teacher_username}`
                                  : p.teacher_username
                                    ? ` · aguardando @${p.teacher_username}`
                                    : " · autodeclarada"}
                              </p>
                            </div>
                            <DeleteButton kind="promotion" id={p.id!} label={`Apagar ${p.rank_name} de ${formatDate(p.promoted_on!)}`} />
                            <details className="w-full">
                              <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-1 text-sm font-semibold text-accent">
                                <Pencil aria-hidden className="size-4" /> Corrigir {p.rank_name} de {formatDate(p.promoted_on!)}
                              </summary>
                              <div className="mt-2">
                                <PromotionForm
                                  userMartialArtId={j.id!}
                                  ranks={artRanks.map((r) => ({ id: r.id, name: r.name, maxDegrees: r.max_degrees }))}
                                  academies={academies}
                                  teachers={teacherOptions}
                                  initial={{
                                    id: p.id!,
                                    rankId: p.rank_id!,
                                    degree: p.degree ?? 0,
                                    promotedOn: p.promoted_on!,
                                    academyId: p.academy_id,
                                    teacherUsername: p.teacher_username,
                                    notes: p.notes,
                                    confirmed: p.verification === "teacher_confirmed",
                                  }}
                                />
                              </div>
                            </details>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}

                  {j.has_ranks && artRanks.length > 0 && (
                    <details className="mt-4 rounded-md border border-border">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold">
                        <Plus aria-hidden className="size-4" /> Registrar graduação em {j.martial_art_name}
                      </summary>
                      <div className="border-t border-border p-3">
                        <PromotionForm
                          userMartialArtId={j.id!}
                          ranks={artRanks.map((r) => ({ id: r.id, name: r.name, maxDegrees: r.max_degrees }))}
                          academies={academies}
                          teachers={teacherOptions}
                        />
                      </div>
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
          {(journey ?? []).length === 0 ? (
            <Card>
              <AddArtForm arts={(arts ?? []).map((a) => ({ id: a.id, name: a.name }))} />
            </Card>
          ) : (
            <details className="mt-4 rounded-md border border-dashed border-border">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold">
                <Plus aria-hidden className="size-4" /> Adicionar modalidade
              </summary>
              <div className="border-t border-border p-3">
                <AddArtForm arts={(arts ?? []).filter((a) => !usedArts.has(a.id)).map((a) => ({ id: a.id, name: a.name }))} />
              </div>
            </details>
          )}
        </section>

        {/* ------------------------------------------------ professores */}
        <section aria-labelledby="professores" className="scroll-mt-20">
          <h2 id="professores" className="mb-1 flex items-center gap-2 font-display text-2xl font-semibold">
            <GraduationCap aria-hidden className="size-6 text-accent" /> Meus professores
          </h2>
          <p className="mb-3 text-muted">
            Professores que têm você na lista de alunos. Para entrar na lista de alguém, abra a página do professor e toque em “Sou aluno”.
          </p>
          <StudentLinkList
            side="student"
            items={teachers}
            empty={
              <p className="text-sm text-muted">
                Nenhum professor ainda.{" "}
                <Link href={routes.classes} className="font-semibold text-accent hover:underline">
                  Encontre aulas e professores
                </Link>
                .
              </p>
            }
          />
        </section>

        {/* ------------------------------------------------ treinos */}
        <section aria-labelledby="treinos-titulo" id="treinos" className="scroll-mt-20">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="treinos-titulo" className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Dumbbell aria-hidden className="size-6 text-accent" /> Treinos
            </h2>
            <Link href={routes.newCheckin} className={buttonClasses()}>
              <CalendarCheck aria-hidden className="size-4" /> Registrar treino
            </Link>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <Link
                href={`${routes.journey}?mes=${shiftMonth(month, -1)}#treinos`}
                className={buttonClasses("ghost")}
                aria-label={`Mês anterior: ${formatMonth(shiftMonth(month, -1))}`}
              >
                <ChevronLeft aria-hidden className="size-5" />
              </Link>
              <h3 className="text-center font-semibold" aria-live="polite">
                {formatMonth(month)} · {monthTotal} {monthTotal === 1 ? "treino" : "treinos"}
              </h3>
              {month < currentMonth ? (
                <Link
                  href={`${routes.journey}?mes=${shiftMonth(month, 1)}#treinos`}
                  className={buttonClasses("ghost")}
                  aria-label={`Próximo mês: ${formatMonth(shiftMonth(month, 1))}`}
                >
                  <ChevronRight aria-hidden className="size-5" />
                </Link>
              ) : (
                <span className="w-11" />
              )}
            </div>
            <table className="w-full table-fixed text-center text-sm">
              <caption className="sr-only">Dias com treino registrado em {formatMonth(month)}</caption>
              <thead>
                <tr>
                  {WEEK_ORDER.map((d) => (
                    <th key={d} scope="col" className="pb-1 text-[13px] font-medium text-muted">
                      {WEEKDAY_SHORT[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week[0]!.day}>
                    {week.map((d) => {
                      const dayNumber = Number(d.day.slice(8));
                      return (
                        <td key={d.day} className="p-0.5">
                          {d.inMonth ? (
                            <span
                              className={
                                d.count > 0
                                  ? "flex aspect-square items-center justify-center rounded-md bg-primary font-semibold text-on-primary"
                                  : "flex aspect-square items-center justify-center rounded-md text-muted"
                              }
                            >
                              <span aria-hidden>{dayNumber}</span>
                              <span className="sr-only">
                                {dayNumber}: {d.count === 0 ? "sem treino" : d.count === 1 ? "1 treino" : `${d.count} treinos`}
                              </span>
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {(recent ?? []).length > 0 ? (
            <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
              {(recent ?? []).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      Registrou um treino de {c.martial_art_name}
                      {c.academy_name ? ` em ${c.academy_name}` : ""}
                    </p>
                    <p className="text-[13px] text-muted">
                      {formatDateTime(c.trained_at!)}
                      {c.duration_min ? ` · ${c.duration_min} min` : ""}
                      {c.class_name ? ` · ${c.class_name}` : ""}
                      {c.post_id ? " · compartilhado no feed" : ""}
                    </p>
                    {c.notes && <p className="mt-1 text-sm">{c.notes}</p>}
                  </div>
                  <DeleteButton kind="checkin" id={c.id!} label={`Apagar treino de ${formatDateTime(c.trained_at!)}`} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState icon={Dumbbell} title="Nenhum treino registrado" description="Registre seus treinos para acompanhar a frequência mês a mês." />
            </div>
          )}
        </section>

        {/* ------------------------------------------------ conquistas */}
        <section aria-labelledby="conquistas">
          <h2 id="conquistas" className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
            <Trophy aria-hidden className="size-6 text-accent" /> Conquistas
          </h2>
          {(achievements ?? []).length > 0 ? (
            <ul className="mb-4 divide-y divide-border rounded-md border border-border bg-surface">
              {(achievements ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {a.title}
                      {a.medal ? ` · ${MEDAL_LABELS[a.medal as MedalKind]}` : ""}
                      {placementLabel(a.placement) ? ` · ${placementLabel(a.placement)}` : ""}
                    </p>
                    <p className="text-[13px] text-muted">
                      {ACHIEVEMENT_TYPE_LABELS[a.type as AchievementType]} · {formatDate(a.achieved_on)}
                      {a.event_name ? ` · ${a.event_name}` : ""}
                      {a.division ? ` · ${a.division}` : ""}
                      {(a.martial_arts as { name: string } | null)?.name ? ` · ${(a.martial_arts as { name: string }).name}` : ""}
                    </p>
                  </div>
                  <DeleteButton kind="achievement" id={a.id} label={`Apagar conquista ${a.title}`} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-muted">Medalhas, marcos e certificações aparecem aqui e no seu perfil.</p>
          )}
          <details className="rounded-md border border-dashed border-border">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold">
              <Plus aria-hidden className="size-4" /> Registrar conquista
            </summary>
            <div className="border-t border-border p-3">
              <AchievementForm arts={(arts ?? []).map((a) => ({ id: a.id, name: a.name }))} />
            </div>
          </details>
        </section>
      </div>
    </>
  );
}
