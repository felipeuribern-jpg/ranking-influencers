// Constantes de docs/FORMULA.md. Ajusta aquí, no en score.ts.

export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "snapchat";

export const PLATFORMS: readonly Platform[] = [
  "youtube",
  "tiktok",
  "instagram",
  "linkedin",
  "facebook",
  "snapchat",
];

// FORMULA.md §2 — peso por red.
export const PLATFORM_WEIGHTS: Record<Platform, number> = {
  youtube: 1.2,
  tiktok: 1.0,
  instagram: 1.0,
  linkedin: 1.3,
  facebook: 0.7,
  snapchat: 0.6,
};

// FORMULA.md §3 — mínimo de publicaciones válidas para calcular `er`.
export const MIN_POSTS_FOR_ENGAGEMENT = 3;
export const ENGAGEMENT_WINDOW_POSTS = 12;
export const ENGAGEMENT_MIN_POST_AGE_HOURS = 48;

// FORMULA.md §4 — factor de interacción: sqrt(clamp(ratio, 0.25, 4)) => 0.5..2.
export const ENGAGEMENT_RATIO_MIN = 0.25;
export const ENGAGEMENT_RATIO_MAX = 4;

// FORMULA.md §4 — factor de impulso: 1 + clamp(crec, -0.20, 0.50) => 0.8..1.5.
export const GROWTH_CLAMP_MIN = -0.2;
export const GROWTH_CLAMP_MAX = 0.5;

export const REACH_DIVISOR = 10_000;
export const POINTS_SCALE = 1000;

// FORMULA.md §5 — el voto del público no puede aportar más del 10 % de puntos_redes.
export const PUBLIC_POINTS_SHARE_CAP = 0.1;
export const PUBLIC_POINTS_VOTE_SCALE = 800;

// FORMULA.md §8 — una red sin actualizar por más de 30 días deja de puntuar.
export const STALE_AFTER_DAYS = 30;

// docs/FUENTES_DE_DATOS.md — umbral mínimo de seguidores verificados para que un
// candidato descubierto automáticamente (pipeline/discover.ts) entre al ranking público.
export const AUTO_DISCOVERY_MIN_FOLLOWERS = 100_000;
