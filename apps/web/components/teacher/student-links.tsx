"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { GraduationCap, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { inviteStudent, removeStudentLink, requestTeacher, respondStudentLink } from "@/app/actions/teachers";
import { idleState } from "@/lib/form-state";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";

export type StudentLink = {
  teacherId: string;
  studentId: string;
  status: "pending" | "active";
  requestedBy: "teacher" | "student";
  /** A outra parte do vínculo (aluno, na visão do professor; professor, na visão do aluno). */
  name: string;
  username: string;
  avatarPath: string | null;
};

type Side = "teacher" | "student";

function describe(link: StudentLink, side: Side) {
  if (link.status === "active") return side === "teacher" ? "Aluno" : "Seu professor";
  const mine = link.requestedBy === side;
  if (side === "teacher") return mine ? "Convite enviado, aguardando aceite" : "Pediu para constar como seu aluno";
  return mine ? "Pedido enviado, aguardando o professor" : "Convidou você para a lista de alunos";
}

/** Lista de vínculos com as ações de cada lado. O resultado aparece na hora (sem recarregar a página). */
export function StudentLinkList({ side, items, empty }: { side: Side; items: StudentLink[]; empty: React.ReactNode }) {
  const [links, setLinks] = useState(items);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function run(link: StudentLink, action: "accept" | "decline" | "remove") {
    startTransition(async () => {
      const result =
        action === "remove"
          ? await removeStudentLink(link.teacherId, link.studentId)
          : await respondStudentLink(link.teacherId, link.studentId, action === "accept");
      setNotice(result.message ?? "");
      if (!result.ok) return;
      setLinks((current) =>
        action === "accept"
          ? current.map((l) => (l === link ? { ...l, status: "active" } : l))
          : current.filter((l) => l !== link),
      );
    });
  }

  // Pedidos que pedem resposta primeiro, depois ativos, depois os que eu enviei.
  const order = (l: StudentLink) => (l.status === "pending" && l.requestedBy !== side ? 0 : l.status === "active" ? 1 : 2);
  const sorted = [...links].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div>
      {sorted.length === 0 ? (
        empty
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {sorted.map((link) => {
            const href = side === "student" ? routes.teacher(link.username) : routes.profile(link.username);
            const awaitingMe = link.status === "pending" && link.requestedBy !== side;
            return (
              <li key={`${link.teacherId}:${link.studentId}`} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <Link href={href} className="flex min-w-0 items-center gap-3 hover:underline">
                  <Avatar name={link.name} path={link.avatarPath} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{link.name}</span>
                    <span className="block text-[13px] text-muted">
                      @{link.username} · {describe(link, side)}
                    </span>
                  </span>
                </Link>
                <span className="flex flex-wrap gap-2">
                  {awaitingMe ? (
                    <>
                      <Button disabled={pending} onClick={() => run(link, "accept")}>
                        <UserCheck aria-hidden className="size-4" /> Aceitar
                      </Button>
                      <Button variant="secondary" disabled={pending} onClick={() => run(link, "decline")}>
                        Recusar
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" disabled={pending} onClick={() => run(link, "remove")}>
                      {link.status === "active" ? <UserMinus aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
                      {link.status === "active"
                        ? side === "teacher"
                          ? `Remover ${link.name}`
                          : `Deixar de ser aluno de ${link.name}`
                        : side === "teacher"
                          ? `Cancelar convite de ${link.name}`
                          : `Cancelar pedido a ${link.name}`}
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="mt-2 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}

/** Professor convida pelo @usuário. */
export function InviteStudentForm() {
  const [state, action, pending] = useActionState(inviteStudent, idleState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" noValidate>
      <div className="min-w-64 flex-1">
        <InputField
          id="username"
          label="Adicionar aluno"
          placeholder="@usuario"
          help="A pessoa recebe um convite e precisa aceitar para entrar na sua lista."
          errors={state.fieldErrors?.username}
          defaultValue={state.status === "error" ? state.values?.username : ""}
        />
      </div>
      <Button type="submit" loading={pending}>
        <UserPlus aria-hidden className="size-4" /> Convidar
      </Button>
      <div className="w-full empty:hidden">
        {state.status !== "idle" && state.message && <FormMessage status={state.status} message={state.message} />}
      </div>
    </form>
  );
}

/** Botão "Sou aluno" na página pública do professor. */
export function StudentRequestButton({
  teacherId,
  teacherName,
  viewerId,
  initial,
  signInHref,
}: {
  teacherId: string;
  viewerId: string | null;
  teacherName: string;
  initial: "none" | "pending" | "active" | "invited" | "self" | "anon";
  signInHref: string;
}) {
  const [status, setStatus] = useState(initial);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  if (status === "self") return null;
  if (status === "anon") {
    return (
      <ButtonLink href={signInHref} variant="secondary">
        <GraduationCap aria-hidden className="size-4" /> Entrar para dizer que é aluno
      </ButtonLink>
    );
  }

  function request() {
    startTransition(async () => {
      const result = await requestTeacher(teacherId);
      setNotice(result.message ?? "");
      if (result.ok && result.status) setStatus(result.status);
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await removeStudentLink(teacherId, viewerId ?? "");
      setNotice(result.message ?? "");
      if (result.ok) setStatus("none");
    });
  }

  return (
    <div>
      {status === "none" && (
        <Button variant="secondary" disabled={pending} onClick={request}>
          <GraduationCap aria-hidden className="size-4" /> Sou aluno de {teacherName}
        </Button>
      )}
      {status === "invited" && (
        <Button disabled={pending} onClick={request}>
          <UserCheck aria-hidden className="size-4" /> Aceitar convite de aluno
        </Button>
      )}
      {(status === "pending" || status === "active") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <GraduationCap aria-hidden className="size-4 text-accent" />
            {status === "active" ? "Você é aluno deste professor" : "Pedido enviado, aguardando o professor"}
          </span>
          <Button variant="ghost" disabled={pending} onClick={cancel}>
            {status === "active" ? "Deixar de ser aluno" : "Cancelar pedido"}
          </Button>
        </div>
      )}
      <p aria-live="polite" className="mt-2 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
