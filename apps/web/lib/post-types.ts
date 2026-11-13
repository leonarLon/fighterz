// Tipos de exibição compartilhados entre Server e Client Components (sem dependências de servidor).
export type PostMediaView = {
  id: string;
  type: "image" | "video";
  url: string;
  /** Miniatura do vídeo (URL assinada). */
  poster: string | null;
  durationMs: number | null;
  width: number;
  height: number;
  alt: string;
};

export type PostView = {
  id: string;
  author: { id: string; username: string; displayName: string; avatarPath: string | null };
  kind: "standard" | "checkin" | "achievement" | "event_share";
  caption: string;
  visibility: "public" | "followers" | "private";
  locationLabel: string | null;
  martialArtName: string | null;
  /** Academia citada no post (registro de treino). */
  academy: { name: string; slug: string } | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  moderationStatus: "visible" | "under_review" | "removed";
  mentions: string[];
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  media: PostMediaView[];
};

export type CommentView = {
  id: string;
  parentId: string | null;
  author: { id: string; username: string; displayName: string; avatarPath: string | null };
  body: string;
  likeCount: number;
  createdAt: string;
  viewerHasLiked: boolean;
};

/** Contexto do leitor para decidir quais ações mostrar. */
export type Viewer = { id: string; username: string } | null;
