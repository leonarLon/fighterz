import type { ClassLevel, Database } from "@figtherz/core";
import type { ScheduleItem } from "@/components/academy/schedule-grid";
import type { WeeklySlot } from "@/components/teacher/next-class";
import { routes } from "@/lib/routes";

type TeacherClassRow = Database["public"]["Views"]["teacher_class_cards"]["Row"];
type AcademyClassRow = Database["public"]["Views"]["class_cards"]["Row"];

/** Aula da grade própria do professor → formato comum (próxima aula, mapa). */
export function slotFromTeacherClass(c: TeacherClassRow): WeeklySlot {
  return {
    id: c.id!,
    weekday: c.weekday!,
    starts_at: c.starts_at!,
    ends_at: c.ends_at!,
    level: c.level as ClassLevel,
    martialArtName: c.martial_art_name ?? "",
    placeName: c.place_name ?? "",
    placeHref: c.academy_slug ? routes.academy(c.academy_slug) : null,
    confirmed: c.academy_id ? Boolean(c.academy_confirmed) : null,
    address: {
      street: c.street,
      number: c.number,
      complement: c.complement,
      neighborhood: c.neighborhood,
      city: c.city ?? "",
      state: c.state ?? "",
      postal_code: c.postal_code,
      latitude: c.latitude,
      longitude: c.longitude,
    },
  };
}

/** Aula da grade de uma academia (vínculo ativo) → formato comum. */
export function slotFromAcademyClass(c: AcademyClassRow): WeeklySlot {
  return {
    id: c.id!,
    weekday: c.weekday!,
    starts_at: c.starts_at!,
    ends_at: c.ends_at!,
    level: c.level as ClassLevel,
    martialArtName: c.martial_art_name ?? "",
    placeName: `${c.academy_name}${c.unit_name ? ` · ${c.unit_name}` : ""}`,
    placeHref: c.academy_slug ? routes.academy(c.academy_slug) : null,
    confirmed: true,
    address: {
      street: c.street,
      number: c.number,
      complement: c.complement,
      neighborhood: c.neighborhood,
      city: c.city ?? "",
      state: c.state ?? "",
      postal_code: c.postal_code,
      latitude: c.latitude,
      longitude: c.longitude,
    },
  };
}

/** Aula da grade própria → item da grade semanal (ScheduleGrid). */
export function scheduleItemFromTeacherClass(c: TeacherClassRow): ScheduleItem {
  return {
    id: c.id!,
    name: `Aula de ${c.martial_art_name ?? ""}`,
    weekday: c.weekday!,
    starts_at: c.starts_at!,
    ends_at: c.ends_at!,
    level: c.level as ClassLevel,
    status: "active",
    accepts_trial: c.accepts_trial ?? false,
    martial_art_name: c.martial_art_name ?? "",
    academy_name: c.place_name ?? "",
    academy_slug: c.academy_slug ?? undefined,
    place_pending: Boolean(c.academy_id) && !c.academy_confirmed,
    place_free: !c.academy_id,
    notes: c.notes,
  };
}
