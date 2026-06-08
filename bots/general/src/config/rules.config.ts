// ── Rules panel configuration ───────────────────────────────────────
// Source de vérité pour le message de règlement.
// Modifie cette structure puis relance /rules-panel pour (re)poster.

export interface Rule {
  emoji: string; // numéro/emoji affiché devant la règle
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
}

export const RULES_TITLE = {
  fr: "Règlement",
  en: "Rules",
};

export const RULES_INTRO = {
  fr: "Quelques règles simples pour que tout le monde s'y sente bien.",
  en: "A few simple rules so everyone feels at home.",
};

export const RULES: Rule[] = [
  {
    emoji: "1️⃣",
    titleFr: "Respect",
    titleEn: "Respect",
    descFr: "Aucune insulte, harcèlement ou toxicité.",
    descEn: "No insults, harassment or toxicity.",
  },
  {
    emoji: "2️⃣",
    titleFr: "Spam",
    titleEn: "Spam",
    descFr: "Pas de spam, pubs ou liens non autorisés.",
    descEn: "No spam, ads or unauthorized links.",
  },
  {
    emoji: "3️⃣",
    titleFr: "Contenu",
    titleEn: "Content",
    descFr: "Pas de NSFW ni contenu illégal.",
    descEn: "No NSFW or illegal content.",
  },
  {
    emoji: "4️⃣",
    titleFr: "Channels",
    titleEn: "Channels",
    descFr: "Postez au bon endroit.",
    descEn: "Use the right channels.",
  },
  {
    emoji: "5️⃣",
    titleFr: "Leaks",
    titleEn: "Leaks",
    descFr: "Uniquement dans le channel dédié.",
    descEn: "Only in the dedicated channel.",
  },
  {
    emoji: "6️⃣",
    titleFr: "Pseudo",
    titleEn: "Nickname",
    descFr: "Lisible et mentionnable.",
    descEn: "Readable and mentionable.",
  },
  {
    emoji: "7️⃣",
    titleFr: "Langue",
    titleEn: "Language",
    descFr: "FR & EN.",
    descEn: "FR & EN.",
  },
  {
    emoji: "8️⃣",
    titleFr: "Staff",
    titleEn: "Staff",
    descFr: "Décisions finales. Problème → DM.",
    descEn: "Decisions are final. Issues → DM.",
  },
];

export const RULES_SANCTIONS = {
  fr: "Avertissement, mute ou ban selon la gravité.",
  en: "Warning, mute or ban depending on severity.",
};

export const RULES_ACCEPT = {
  fr: "En restant ici, vous acceptez ces règles.",
  en: "By staying, you agree to these rules.",
};
