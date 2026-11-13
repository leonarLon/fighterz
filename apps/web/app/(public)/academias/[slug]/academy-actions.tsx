"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, GraduationCap, UserRoundCheck } from "lucide-react";
import { leaveMembership, requestMembership, setAcademyFollow } from "@/app/actions/academies";
import { Button } from "@/components/ui/button";

type Membership = { role: string; status: string; requested_by: string };

export function AcademyActions({
  academyId,
  following,
  memberships,
  isApprovedTeacher,
}: {
  academyId: string;
  following: boolean;
  memberships: Membership[];
  isApprovedTeacher: boolean;
}) {
  const router = useRouter();
  const [isFollowing, setFollowing] = useState(following);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const find = (role: string) => memberships.find((m) => m.role === role && (m.status === "active" || m.status === "pending"));
  const student = find("student");
  const teacher = find("teacher");

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setNotice(result.message ?? "");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          aria-pressed={isFollowing}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const next = !isFollowing;
              setFollowing(next);
              const result = await setAcademyFollow(academyId, next);
              if (!result.ok) {
                setFollowing(!next);
                setNotice(result.message ?? "");
              }
            })
          }
        >
          {isFollowing ? <BellOff aria-hidden className="size-4" /> : <Bell aria-hidden className="size-4" />}
          {isFollowing ? "Seguindo" : "Seguir academia"}
        </Button>

        {student?.status === "active" ? (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => leaveMembership(academyId, "student"))}>
            <UserRoundCheck aria-hidden className="size-4" /> Sou aluno · sair
          </Button>
        ) : student?.status === "pending" ? (
          <Button variant="secondary" disabled>
            Pedido de aluno enviado
          </Button>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => requestMembership(academyId, "student"))}>
            <UserRoundCheck aria-hidden className="size-4" /> Treino aqui
          </Button>
        )}

        {isApprovedTeacher &&
          (teacher?.status === "active" ? (
            <Button variant="ghost" disabled={pending} onClick={() => run(() => leaveMembership(academyId, "teacher"))}>
              <GraduationCap aria-hidden className="size-4" /> Dou aula aqui · sair
            </Button>
          ) : teacher?.status === "pending" ? (
            <Button variant="ghost" disabled>
              {teacher.requested_by === "academy" ? "Convite pendente (veja Área do professor)" : "Pedido de professor enviado"}
            </Button>
          ) : (
            <Button variant="ghost" disabled={pending} onClick={() => run(() => requestMembership(academyId, "teacher"))}>
              <GraduationCap aria-hidden className="size-4" /> Dou aula aqui
            </Button>
          ))}
      </div>
      <p aria-live="polite" className="text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
