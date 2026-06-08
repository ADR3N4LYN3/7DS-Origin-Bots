// ── Roles panel configuration ───────────────────────────────────────
// Source de vérité pour le panneau de rôles auto-attribuables.
// Modifie cette structure puis relance /roles-panel pour (re)poster le message.

export interface RolePanelItem {
  emoji: string; // unicode ("🪙") ou custom ("<:nom:id>")
  roleId: string;
  label: string; // libellé du bouton
}

export interface RolePanelCategory {
  emoji: string;
  titleFr: string;
  titleEn: string;
  items: RolePanelItem[];
}

export const ROLE_PANEL_TITLE = {
  fr: "Choisis tes rôles",
  en: "Pick your roles",
};

export const ROLE_PANEL_CATEGORIES: RolePanelCategory[] = [
  {
    emoji: "🔔",
    titleFr: "NOTIFICATIONS",
    titleEn: "NOTIFICATIONS",
    items: [
      { emoji: "<:keycube:1494587138795376690>", roleId: "1488083226856787998", label: "Notif Codes" },
      { emoji: "<:7Origin:1513528921617072309>", roleId: "1488086597269458944", label: "Notif 7DSO Offi" },
      { emoji: "<:7DSAPP:1513529185736589393>", roleId: "1488447298823393311", label: "Notif 7DS APP" },
      { emoji: "<:boss:1494587414214344826>", roleId: "1488552015486521364", label: "Notif Leaks" },
      { emoji: "<:YouTube:1513531221747957891>", roleId: "1513524913275928626", label: "Notif Live/YouTube" },
      { emoji: "<:treasurebox:1494587446631989248>", roleId: "1513525057086034032", label: "Notif Giveaway" },
    ],
  },
  {
    emoji: "🎮",
    titleFr: "PLATEFORME",
    titleEn: "PLATFORM",
    items: [
      { emoji: "<:steam:1513531345807343787>", roleId: "1513524431425900554", label: "PC/Steam" },
      { emoji: "<:PS5:1513532020611874998>", roleId: "1513524578603896842", label: "PS5" },
      { emoji: "<:Mobile:1513532253228109844>", roleId: "1513524637672149213", label: "Mobile" },
    ],
  },
  {
    emoji: "📊",
    titleFr: "NIVEAU",
    titleEn: "LEVEL",
    items: [
      { emoji: "<:SSR:1488553581329256479>", roleId: "1488448509408444436", label: "High" },
      { emoji: "<:SR:1513532965735633058>", roleId: "1488448484167389245", label: "Mid" },
      { emoji: "<:RR:1513533009268183200>", roleId: "1488448254344564756", label: "New" },
    ],
  },
];
