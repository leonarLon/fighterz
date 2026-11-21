// Bucket público `covers`: logo, banner e galeria de academias e páginas comerciais.
export const COVERS_BUCKET = "covers";

export type CoverEntity = "academy" | "business";

/** URL pública (leitura pública; escrita só pela gestão da entidade, conferida no banco). */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COVERS_BUCKET}/${path}`;
}

/** Caminho novo e aleatório, no formato que o banco aceita. */
export function newCoverPath(entity: CoverEntity, id: string, slot: "logo" | "banner" | "gallery" | "item", ext: "webp" | "jpg") {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${entity}/${id}/${slot}-${random}.${ext}`;
}
