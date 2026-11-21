"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { setBusinessFollow } from "@/app/actions/businesses";
import { Button } from "@/components/ui/button";

/** Seguir a página: os posts públicos dela entram no Início. Atualiza na hora e desfaz se o banco recusar. */
export function FollowBusinessButton({ businessId, following }: { businessId: string; following: boolean }) {
  const [isFollowing, setFollowing] = useState(following);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <Button
        variant={isFollowing ? "secondary" : "primary"}
        aria-pressed={isFollowing}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = !isFollowing;
            setFollowing(next);
            const result = await setBusinessFollow(businessId, next);
            if (!result.ok) {
              setFollowing(!next);
              setError(result.message);
            } else setError("");
          })
        }
      >
        {isFollowing ? <BellOff aria-hidden className="size-4" /> : <Bell aria-hidden className="size-4" />}
        {isFollowing ? "Seguindo" : "Seguir página"}
      </Button>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
