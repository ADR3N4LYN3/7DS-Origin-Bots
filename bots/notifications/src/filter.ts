// Filtrage par mots-clés d'une chaîne qui couvre plusieurs jeux.
// Le titre seul ne suffit pas : « SSR Derieri Is BROKEN! » est une vidéo 7DS
// sans jamais nommer le jeu — c'est la description qui porte l'indice.

export interface KeywordFilter {
  include?: string[] | null; // vide/absent = tout passe
  exclude?: string[] | null;
}

// NFD decompose les accents en marques combinantes ; \p{M} les balaie toutes.
const COMBINING = /\p{M}/gu;

// Minuscules + accents retirés, des deux côtés de la comparaison.
export function normalize(s: string): string {
  return s.normalize("NFD").replace(COMBINING, "").toLowerCase().trim();
}

// Saisie humaine : « 7ds, seven deadly, nanatsu ».
export function parseTerms(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTerms(terms: string[] | null | undefined): string {
  return terms?.length ? terms.join(", ") : "—";
}

export function hasFilter(f: KeywordFilter): boolean {
  return Boolean(f.include?.length || f.exclude?.length);
}

/**
 * `exclude` l'emporte toujours ; `include` vide laisse tout passer.
 */
export function matchesFilter(f: KeywordFilter, ...fields: string[]): boolean {
  const hay = normalize(fields.join("\n"));
  const exc = (f.exclude ?? []).map(normalize).filter(Boolean);
  if (exc.some((t) => hay.includes(t))) return false;

  const inc = (f.include ?? []).map(normalize).filter(Boolean);
  if (inc.length === 0) return true;
  return inc.some((t) => hay.includes(t));
}

// Une vidéo plus vieille que ça n'est jamais annoncée : elle ne peut être qu'une
// entrée réapparue dans le flux, pas une nouveauté.
export const MAX_AGE_MS = 7 * 86_400_000;
// Deux entrées de même titre à moins de 48 h = même live publié deux fois.
export const TITLE_DEDUPE_MS = 48 * 3_600_000;

export type SkipReason = "too old" | "filtered out" | "duplicate title";

/**
 * Pourquoi cette vidéo ne doit PAS être annoncée, ou `null` si elle doit l'être.
 * `history` = les entrées déjà traitées, titres normalisés.
 */
export function skipReason(
  filter: KeywordFilter,
  video: { title: string; description: string },
  publishedAt: number,
  history: { title: string; at: number }[],
  now: number,
): SkipReason | null {
  if (now - publishedAt > MAX_AGE_MS) return "too old";
  if (!matchesFilter(filter, video.title, video.description)) return "filtered out";
  const title = normalize(video.title);
  if (history.some((e) => e.title === title && now - e.at < TITLE_DEDUPE_MS)) {
    return "duplicate title";
  }
  return null;
}
