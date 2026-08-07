// Libellés giveaway (carte publique, modal d'inscription, réponses éphémères).
// La carte publique s'affiche en FR par défaut ; le modal et les réponses
// éphémères suivent la locale Discord du membre.

export type Lang = "fr" | "en" | "es" | "de";

export const LANG_BUTTONS: { code: Lang; emoji: string; label: string }[] = [
  { code: "en", emoji: "🇬🇧", label: "EN" },
  { code: "es", emoji: "🇪🇸", label: "ES" },
  { code: "de", emoji: "🇩🇪", label: "DE" },
];

export interface GiveawayStrings {
  // ── Carte publique ──
  prizesHeader: string;
  tiers: [string, string, string];
  draw: string;
  host: string;
  participants: string;
  cta: string;
  join: string;
  // ── Modal d'inscription ──
  modalTitle: string;
  pseudoLabel: string;
  pseudoDesc: string;
  pseudoPlaceholder: string;
  uidLabel: string;
  uidDesc: string;
  uidPlaceholder: string;
  // ── Réponses éphémères ──
  joined: string;
  updated: string;
  alreadyIn: string;
  yourPseudo: string;
  yourUid: string;
  notProvided: string;
  btnEdit: string;
  btnLeave: string;
  left: string;
  notFound: string;
  isEnded: string;
  badPseudo: string;
  badUid: string;
  uidTaken: string;
}

export const I18N: Record<Lang, GiveawayStrings> = {
  fr: {
    prizesHeader: "🎁 Lots à gagner",
    tiers: ["1ʳᵉ place", "2ᵉ place", "3ᵉ place"],
    draw: "Tirage",
    host: "Hôte",
    participants: "Participants",
    cta: "🎉 Clique sur **Participer** — pseudo en jeu requis, Lootbar facultatif.",
    join: "Participer",

    modalTitle: "Participer au giveaway",
    pseudoLabel: "Pseudo en jeu",
    pseudoDesc: "Ton pseudo exact dans 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Pseudo ou UID Lootbar",
    uidDesc: "Facultatif. Ton pseudo Lootbar, ou ton UID (U1062182404).",
    uidPlaceholder: "MonPseudo  ou  U1062182404",

    joined: "✅ **Ta participation est enregistrée !**",
    updated: "✏️ **Tes informations ont été mises à jour.**",
    alreadyIn: "✅ **Tu participes déjà à ce giveaway.**",
    yourPseudo: "Pseudo",
    yourUid: "Lootbar",
    notProvided: "*non renseigné*",
    btnEdit: "Modifier mes infos",
    btnLeave: "Quitter",
    left: "🚪 **Tu t'es désinscrit.** Reclique sur Participer pour revenir.",
    notFound: "❌ Giveaway introuvable.",
    isEnded: "❌ Ce giveaway est terminé.",
    badPseudo: "❌ Pseudo invalide : entre 2 et 32 caractères.",
    badUid: "❌ Pseudo ou UID Lootbar invalide : entre 2 et 32 caractères (ou laisse vide).",
    uidTaken: "❌ Ce compte Lootbar est déjà utilisé par un autre participant.",
  },
  en: {
    prizesHeader: "🎁 Prizes",
    tiers: ["1st place", "2nd place", "3rd place"],
    draw: "Draw",
    host: "Host",
    participants: "Participants",
    cta: "🎉 Click **Participate** — in-game nickname required, Lootbar optional.",
    join: "Participate",

    modalTitle: "Join the giveaway",
    pseudoLabel: "In-game nickname",
    pseudoDesc: "Your exact nickname in 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Lootbar name or UID",
    uidDesc: "Optional. Your Lootbar name, or your UID (U1062182404).",
    uidPlaceholder: "MyName  or  U1062182404",

    joined: "✅ **You're in the giveaway!**",
    updated: "✏️ **Your details have been updated.**",
    alreadyIn: "✅ **You already joined this giveaway.**",
    yourPseudo: "Nickname",
    yourUid: "Lootbar",
    notProvided: "*not provided*",
    btnEdit: "Edit my details",
    btnLeave: "Leave",
    left: "🚪 **You left.** Click Participate again to rejoin.",
    notFound: "❌ Giveaway not found.",
    isEnded: "❌ This giveaway has ended.",
    badPseudo: "❌ Invalid nickname: 2 to 32 characters.",
    badUid: "❌ Invalid Lootbar name or UID: 2 to 32 characters (or leave it empty).",
    uidTaken: "❌ This Lootbar account is already used by another participant.",
  },
  es: {
    prizesHeader: "🎁 Premios",
    tiers: ["1.er puesto", "2.º puesto", "3.er puesto"],
    draw: "Sorteo",
    host: "Anfitrión",
    participants: "Participantes",
    cta: "🎉 Pulsa **Participar** — apodo en el juego obligatorio, Lootbar opcional.",
    join: "Participar",

    modalTitle: "Participar en el sorteo",
    pseudoLabel: "Apodo en el juego",
    pseudoDesc: "Tu apodo exacto en 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Apodo o UID de Lootbar",
    uidDesc: "Opcional. Tu apodo de Lootbar, o tu UID (U1062182404).",
    uidPlaceholder: "MiApodo  o  U1062182404",

    joined: "✅ **¡Tu participación ha sido registrada!**",
    updated: "✏️ **Tus datos se han actualizado.**",
    alreadyIn: "✅ **Ya participas en este sorteo.**",
    yourPseudo: "Apodo",
    yourUid: "Lootbar",
    notProvided: "*sin indicar*",
    btnEdit: "Editar mis datos",
    btnLeave: "Salir",
    left: "🚪 **Has salido.** Pulsa Participar de nuevo para volver.",
    notFound: "❌ Sorteo no encontrado.",
    isEnded: "❌ Este sorteo ha terminado.",
    badPseudo: "❌ Apodo no válido: entre 2 y 32 caracteres.",
    badUid: "❌ Apodo o UID de Lootbar no válido: entre 2 y 32 caracteres (o déjalo vacío).",
    uidTaken: "❌ Otro participante ya usa esta cuenta de Lootbar.",
  },
  de: {
    prizesHeader: "🎁 Preise",
    tiers: ["1. Platz", "2. Platz", "3. Platz"],
    draw: "Auslosung",
    host: "Gastgeber",
    participants: "Teilnehmer",
    cta: "🎉 Klicke auf **Teilnehmen** — Spielername erforderlich, Lootbar optional.",
    join: "Teilnehmen",

    modalTitle: "Am Giveaway teilnehmen",
    pseudoLabel: "Spielername",
    pseudoDesc: "Dein exakter Name in 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Lootbar-Name oder -UID",
    uidDesc: "Optional. Dein Lootbar-Name oder deine UID (U1062182404).",
    uidPlaceholder: "MeinName  oder  U1062182404",

    joined: "✅ **Deine Teilnahme wurde gespeichert!**",
    updated: "✏️ **Deine Angaben wurden aktualisiert.**",
    alreadyIn: "✅ **Du nimmst bereits an diesem Giveaway teil.**",
    yourPseudo: "Name",
    yourUid: "Lootbar",
    notProvided: "*nicht angegeben*",
    btnEdit: "Angaben ändern",
    btnLeave: "Verlassen",
    left: "🚪 **Du hast das Giveaway verlassen.** Klicke erneut auf Teilnehmen.",
    notFound: "❌ Giveaway nicht gefunden.",
    isEnded: "❌ Dieses Giveaway ist beendet.",
    badPseudo: "❌ Ungültiger Name: 2 bis 32 Zeichen.",
    badUid: "❌ Ungültiger Lootbar-Name bzw. -UID: 2 bis 32 Zeichen (oder leer lassen).",
    uidTaken: "❌ Dieses Lootbar-Konto wird bereits von einem anderen Teilnehmer verwendet.",
  },
};

// Locale Discord (`fr`, `en-US`, `es-419`, `de`…) → langue supportée.
// Défaut EN : c'est le repli le plus large pour les locales qu'on ne traduit pas.
export function langFromLocale(locale: string | undefined): Lang {
  const base = (locale ?? "").split("-")[0].toLowerCase();
  return base === "fr" || base === "es" || base === "de" ? base : "en";
}
