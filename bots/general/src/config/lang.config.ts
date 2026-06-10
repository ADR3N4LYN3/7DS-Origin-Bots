// ── Language panel configuration ────────────────────────────────────
// Source de vérité pour le panneau des rôles de langue.
// Modifie cette structure puis relance /lang-panel pour (re)poster.

import type { RolePanelCategory } from "./roles.config.js";

export const LANG_PANEL_TITLE = {
  fr: "Choisis ta langue",
  en: "Pick your language",
};

export const LANG_PANEL_CATEGORIES: RolePanelCategory[] = [
  {
    emoji: "🌐",
    titleFr: "LANGUES",
    titleEn: "LANGUAGES",
    items: [
      { emoji: "🇫🇷", roleId: "1488089367061987418", label: "Français" },
      { emoji: "🇬🇧", roleId: "1488089435701772379", label: "English" },
      { emoji: "🇩🇪", roleId: "1513546152312701088", label: "Deutsch" },
      { emoji: "🇪🇸", roleId: "1513546241190133904", label: "Español" },
      { emoji: "🇵🇹", roleId: "1513546358953611485", label: "Português" },
    ],
  },
];
