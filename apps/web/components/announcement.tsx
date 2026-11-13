import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/** Aviso da plataforma (Configurações do admin). Some quando está vazio. */
export async function Announcement() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("announcement").maybeSingle();
  if (!data?.announcement) return null;
  return (
    <aside aria-label="Aviso da plataforma" className="border-b border-border bg-accent-soft px-4 py-2 text-center text-sm">
      <Megaphone aria-hidden className="mr-1.5 inline size-4 align-[-3px] text-accent" />
      {data.announcement}
    </aside>
  );
}
