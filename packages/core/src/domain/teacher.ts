// Critério para ser professor (espelha teacher_min_rank_ordinal/teacher_art_qualifies, migration 31):
// faixa preta ou equivalente nas modalidades com graduação; modalidades sem graduação não exigem nada.

export type TeacherArt = { hasRanks: boolean; teacherMinOrdinal: number | null };
export type TeacherRank = { ordinal: number; name: string };

/** Ordem mínima da graduação para ser professor, ou `null` quando a modalidade não tem graduação. */
export function teacherMinOrdinal(art: TeacherArt, ranks: TeacherRank[]): number | null {
  if (!art.hasRanks) return null;
  if (art.teacherMinOrdinal != null) return art.teacherMinOrdinal;
  const black = ranks.filter((r) => /pret/i.test(r.name)).map((r) => r.ordinal);
  if (black.length > 0) return Math.min(...black);
  return ranks.length > 0 ? Math.max(...ranks.map((r) => r.ordinal)) : null;
}

/** Graduações que permitem ser professor naquela modalidade (vazio para modalidades sem graduação). */
export function teacherRankOptions<R extends TeacherRank>(art: TeacherArt, ranks: R[]): R[] {
  const min = teacherMinOrdinal(art, ranks);
  return min == null ? [] : ranks.filter((r) => r.ordinal >= min).sort((a, b) => a.ordinal - b.ordinal);
}
