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
// On coupe aussi sur les sauts de ligne : coller deux lignes d'un coup dans le
// champ Discord produisait un terme « nanatsu\n/notif preview … » qui ne matchait
// plus rien, en silence.
export function parseTerms(raw: string): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\r\n]+/)) {
    const term = part.trim();
    if (!term) continue;
    const key = normalize(term);
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

// Chaque terme entre backticks : un terme mal découpé se voit au premier coup d'œil.
export function formatTerms(terms: string[] | null | undefined): string {
  return terms?.length ? terms.map((t) => `\`${t}\``).join(" · ") : "—";
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
  if (isDuplicateTitle(video.title, publishedAt, history)) return "duplicate title";
  return null;
}

/**
 * Deux entrées de même titre publiées à moins de 48 h l'une de l'autre.
 * On compare les dates de PUBLICATION, pas l'ancienneté vue de maintenant :
 * c'est l'écart entre les deux vidéos qui trahit le live posté en double.
 */
export function isDuplicateTitle(
  rawTitle: string,
  publishedAt: number,
  history: { title: string; at: number }[],
): boolean {
  const title = normalize(rawTitle);
  return history.some((e) => e.title === title && Math.abs(publishedAt - e.at) < TITLE_DEDUPE_MS);
}
