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
    cta: "🎉 Clique sur **Participer** et renseigne ton pseudo + ton UID Lootbar.",
    join: "Participer",

    modalTitle: "Participer au giveaway",
    pseudoLabel: "Pseudo en jeu",
    pseudoDesc: "Ton pseudo exact dans 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "UID Lootbar",
    uidDesc: "Ton identifiant de compte Lootbar, au format U1062182404.",
    uidPlaceholder: "U1062182404",

    joined: "✅ **Ta participation est enregistrée !**",
    updated: "✏️ **Tes informations ont été mises à jour.**",
    alreadyIn: "✅ **Tu participes déjà à ce giveaway.**",
    yourPseudo: "Pseudo",
    yourUid: "UID Lootbar",
    btnEdit: "Modifier mes infos",
    btnLeave: "Quitter",
    left: "🚪 **Tu t'es désinscrit.** Reclique sur Participer pour revenir.",
    notFound: "❌ Giveaway introuvable.",
    isEnded: "❌ Ce giveaway est terminé.",
    badPseudo: "❌ Pseudo invalide : entre 2 et 32 caractères.",
    badUid: "❌ UID Lootbar invalide. Attendu : `U` suivi de chiffres, ex. `U1062182404`.",
    uidTaken: "❌ Cet UID Lootbar est déjà utilisé par un autre participant.",
  },
  en: {
    prizesHeader: "🎁 Prizes",
    tiers: ["1st place", "2nd place", "3rd place"],
    draw: "Draw",
    host: "Host",
    participants: "Participants",
    cta: "🎉 Click **Participate** and fill in your nickname + Lootbar UID.",
    join: "Participate",

    modalTitle: "Join the giveaway",
    pseudoLabel: "In-game nickname",
    pseudoDesc: "Your exact nickname in 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Lootbar UID",
    uidDesc: "Your Lootbar account ID, formatted like U1062182404.",
    uidPlaceholder: "U1062182404",

    joined: "✅ **You're in the giveaway!**",
    updated: "✏️ **Your details have been updated.**",
    alreadyIn: "✅ **You already joined this giveaway.**",
    yourPseudo: "Nickname",
    yourUid: "Lootbar UID",
    btnEdit: "Edit my details",
    btnLeave: "Leave",
    left: "🚪 **You left.** Click Participate again to rejoin.",
    notFound: "❌ Giveaway not found.",
    isEnded: "❌ This giveaway has ended.",
    badPseudo: "❌ Invalid nickname: 2 to 32 characters.",
    badUid: "❌ Invalid Lootbar UID. Expected `U` followed by digits, e.g. `U1062182404`.",
    uidTaken: "❌ This Lootbar UID is already used by another participant.",
  },
  es: {
    prizesHeader: "🎁 Premios",
    tiers: ["1.er puesto", "2.º puesto", "3.er puesto"],
    draw: "Sorteo",
    host: "Anfitrión",
    participants: "Participantes",
    cta: "🎉 Pulsa **Participar** e indica tu apodo + tu UID de Lootbar.",
    join: "Participar",

    modalTitle: "Participar en el sorteo",
    pseudoLabel: "Apodo en el juego",
    pseudoDesc: "Tu apodo exacto en 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "UID de Lootbar",
    uidDesc: "El identificador de tu cuenta Lootbar, con formato U1062182404.",
    uidPlaceholder: "U1062182404",

    joined: "✅ **¡Tu participación ha sido registrada!**",
    updated: "✏️ **Tus datos se han actualizado.**",
    alreadyIn: "✅ **Ya participas en este sorteo.**",
    yourPseudo: "Apodo",
    yourUid: "UID de Lootbar",
    btnEdit: "Editar mis datos",
    btnLeave: "Salir",
    left: "🚪 **Has salido.** Pulsa Participar de nuevo para volver.",
    notFound: "❌ Sorteo no encontrado.",
    isEnded: "❌ Este sorteo ha terminado.",
    badPseudo: "❌ Apodo no válido: entre 2 y 32 caracteres.",
    badUid: "❌ UID de Lootbar no válido. Se espera `U` seguido de cifras, p. ej. `U1062182404`.",
    uidTaken: "❌ Otro participante ya usa este UID de Lootbar.",
  },
  de: {
    prizesHeader: "🎁 Preise",
    tiers: ["1. Platz", "2. Platz", "3. Platz"],
    draw: "Auslosung",
    host: "Gastgeber",
    participants: "Teilnehmer",
    cta: "🎉 Klicke auf **Teilnehmen** und gib deinen Namen + deine Lootbar-UID an.",
    join: "Teilnehmen",

    modalTitle: "Am Giveaway teilnehmen",
    pseudoLabel: "Spielername",
    pseudoDesc: "Dein exakter Name in 7DS Origin.",
    pseudoPlaceholder: "Meliodas",
    uidLabel: "Lootbar-UID",
    uidDesc: "Die Kennung deines Lootbar-Kontos, im Format U1062182404.",
    uidPlaceholder: "U1062182404",

    joined: "✅ **Deine Teilnahme wurde gespeichert!**",
    updated: "✏️ **Deine Angaben wurden aktualisiert.**",
    alreadyIn: "✅ **Du nimmst bereits an diesem Giveaway teil.**",
    yourPseudo: "Name",
    yourUid: "Lootbar-UID",
    btnEdit: "Angaben ändern",
    btnLeave: "Verlassen",
    left: "🚪 **Du hast das Giveaway verlassen.** Klicke erneut auf Teilnehmen.",
    notFound: "❌ Giveaway nicht gefunden.",
    isEnded: "❌ Dieses Giveaway ist beendet.",
    badPseudo: "❌ Ungültiger Name: 2 bis 32 Zeichen.",
    badUid: "❌ Ungültige Lootbar-UID. Erwartet: `U` gefolgt von Ziffern, z. B. `U1062182404`.",
    uidTaken: "❌ Diese Lootbar-UID wird bereits von einem anderen Teilnehmer verwendet.",
  },
};

// Locale Discord (`fr`, `en-US`, `es-419`, `de`…) → langue supportée.
// Défaut EN : c'est le repli le plus large pour les locales qu'on ne traduit pas.
export function langFromLocale(locale: string | undefined): Lang {
  const base = (locale ?? "").split("-")[0].toLowerCase();
  return base === "fr" || base === "es" || base === "de" ? base : "en";
}
