import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import type { ApiClient } from "../api/client.js";
import type {
  CharacterData,
  CharacterSkill,
  CharacterMastery,
  CharacterCostumes,
  CharacterPotential,
} from "../api/types.js";
import { getEmoji } from "../utils/botEmojis.js";

// ── Key → emoji name mappings (resolved at runtime via getEmoji) ────

const ELEMENT_EMOJI_NAMES: Record<string, string> = {
  FIRE: "fire",
  ICE: "ice",
  EARTH: "earth",
  WIND: "wind",
  THUNDER: "thunder",
  HOLY: "holy",
  LIGHT: "holy",       // alias
  DARK: "dark",
  DEFAULT: "physics",
  PHYSICS: "physics",  // alias
};

const ELEMENT_UNICODE: Record<string, string> = {
  FIRE: "🔥", ICE: "🧊", LIGHT: "☀️", HOLY: "✨",
  DARK: "🌑", WIND: "🌪️", EARTH: "🌿", THUNDER: "⚡",
  DEFAULT: "🔮", PHYSICS: "🔮",
};

// Accent color per element — gives each fiche a strong visual identity.
const ELEMENT_COLORS: Record<string, number> = {
  FIRE: 0xe8552e,
  ICE: 0x47b6e8,
  WIND: 0x35c281,
  EARTH: 0xc99a3f,
  THUNDER: 0xf2c230,
  HOLY: 0xf6e7a6,
  LIGHT: 0xf6e7a6,
  DARK: 0x9152c4,
  DEFAULT: 0x9aa4ad,
  PHYSICS: 0x9aa4ad,
};

const RARITY_COLORS: Record<string, number> = {
  SSR: 0xffd700, SR: 0xc084fc, R: 0x60a5fa, N: 0x9ca3af, C: 0x4ade80,
};

const RARITY_EMOJI_NAMES: Record<string, string> = {
  SSR: "badge_ssr",
  SR: "badge_sr",
  R: "badge_r",
  N: "badge_n",
  C: "badge_c",
};

const WEAPON_EMOJI_NAMES: Record<string, string> = {
  SWORD1H: "mastery_sword1h",
  SWORDDUAL: "mastery_sworddual",
  SWORD2H: "mastery_sword2h",
  AXE: "mastery_axe",
  STAFF: "mastery_staff",
  LANCE: "mastery_lance",
  RAPIER: "mastery_rapier",
  SHIELD: "mastery_shield",
  WAND: "mastery_wand",
  BOOK: "mastery_book",
  GAUNTLETS: "mastery_gauntlets",
  CUDGEL3C: "mastery_cudgel3c",
};

// ── Helpers ─────────────────────────────────────────────────────────

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

/** Map a hex color (site's [#hex]…[-] markup) to the nearest ANSI foreground code. */
function ansiCode(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  if (max < 70) return 30;                          // dark → gray
  if (g >= r && g >= b && r < g * 0.85) return 32;  // green (values)
  if (b >= r && b >= g && b > 110) return 34;       // blue (stats)
  if (r >= g && r >= b) return g > 120 ? 33 : 31;   // yellow / red
  if (g > 120 && b > 120) return 36;                // cyan
  return 37;                                        // white
}

/** Convert the site's [#hex]text[-] markup into ANSI escapes for a ```ansi``` block. */
function colorize(text: string): string {
  return text
    .replace(/\[#([0-9A-Fa-f]{6})\]([\s\S]*?)\[-\]/g, (_m, hex: string, inner: string) => `[1;${ansiCode(hex)}m${inner}[0m`)
    .replace(/\[#[0-9A-Fa-f]{6}\]/g, "")
    .replace(/\[-\]/g, "");
}

function pct(n: number): string {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

/** Number with regular spaces so it aligns inside a monospace code block. */
function fmtMono(n: number): string {
  return n.toLocaleString("fr-FR").replace(/[  ]/g, " ");
}

/** Render two stat columns as an aligned monospace table (label left, value right-aligned). */
function twoColTable(left: [string, string][], right: [string, string][]): string {
  const lLabelW = Math.max(0, ...left.map(([l]) => l.length));
  const lValW = Math.max(0, ...left.map(([, v]) => v.length));
  const rLabelW = Math.max(0, ...right.map(([l]) => l.length));
  const rValW = Math.max(0, ...right.map(([, v]) => v.length));
  const leftBlockW = lLabelW + 2 + lValW;
  const rows = Math.max(left.length, right.length);

  const lines: string[] = [];
  for (let i = 0; i < rows; i++) {
    let line = left[i]
      ? `${left[i][0].padEnd(lLabelW)}  ${left[i][1].padStart(lValW)}`
      : " ".repeat(leftBlockW);
    if (right[i]) line += `     ${right[i][0].padEnd(rLabelW)}  ${right[i][1].padStart(rValW)}`;
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}

function parseEmoji(key: string): { id: string; name: string } | undefined {
  const name = WEAPON_EMOJI_NAMES[key];
  if (!name) return undefined;
  const str = getEmoji(name);
  if (!str) return undefined;
  const match = str.match(/<a?:(\w+):(\d+)>/);
  if (!match) return undefined;
  return { name: match[1], id: match[2] };
}

function elemEmoji(key: string): string {
  const name = ELEMENT_EMOJI_NAMES[key];
  return (name && getEmoji(name)) || ELEMENT_UNICODE[key] || "🔮";
}

function weaponEmoji(key: string): string {
  const name = WEAPON_EMOJI_NAMES[key];
  return (name && getEmoji(name)) || "⚔️";
}

/** Inline rarity badge emoji (rendered slightly larger inside the `#` title). */
function rarityBadge(rarity: string): string {
  const name = RARITY_EMOJI_NAMES[rarity];
  return (name && getEmoji(name)) || "";
}

function groupSkillsByWeapon(skills: CharacterSkill[]): Map<string, CharacterSkill[]> {
  const map = new Map<string, CharacterSkill[]>();
  for (const sk of skills) {
    const key = sk.weaponTypeKey;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(sk);
  }
  return map;
}

function sep(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

// ── Lang ────────────────────────────────────────────────────────────

type Lang = "fr" | "en" | "es" | "de" | "pt";

const LANG_OPTIONS: { value: Lang; label: string; emoji: string }[] = [
  { value: "fr", label: "Français",   emoji: "🇫🇷" },
  { value: "en", label: "English",    emoji: "🇬🇧" },
  { value: "es", label: "Español",    emoji: "🇪🇸" },
  { value: "de", label: "Deutsch",    emoji: "🇩🇪" },
  { value: "pt", label: "Português",  emoji: "🇵🇹" },
];

/** UI label localization — FR for "fr", EN otherwise (ES/DE/PT fall back to EN UI). */
function L(lang: Lang, fr: string, en: string): string {
  return lang === "fr" ? fr : en;
}

// ── State ───────────────────────────────────────────────────────────

type Page = "overview" | "skills" | "mastery" | "costumes" | "potential";

const PAGE_OPTIONS: { value: Page; fr: string; en: string; emoji: string }[] = [
  { value: "overview", fr: "Vue d'ensemble", en: "Overview", emoji: "📊" },
  { value: "skills", fr: "Compétences", en: "Skills", emoji: "⚔️" },
  { value: "mastery", fr: "Maîtrise", en: "Mastery", emoji: "🔨" },
  { value: "costumes", fr: "Costumes", en: "Costumes", emoji: "👗" },
  { value: "potential", fr: "Potentiel", en: "Potential", emoji: "🌟" },
];

/** Pages whose content is keyed by weapon (share the weapon select). */
const WEAPON_PAGES: Page[] = ["skills", "mastery", "potential"];

interface CharacterState {
  data: Partial<Record<Lang, CharacterData>>;          // base /characters/{slug}
  mastery: Partial<Record<Lang, CharacterMastery>>;    // /mastery
  costumes: Partial<Record<Lang, CharacterCostumes>>;  // /costumes
  potential: Partial<Record<Lang, CharacterPotential>>;// /potential
  slug: string;
  lang: Lang;
  page: Page;
  activeWeapon: string; // weaponTypeKey
}

function getChar(state: CharacterState): CharacterData {
  return state.data[state.lang]!;
}

function getWeaponTypes(char: CharacterData): string[] {
  return [...new Set(char.skills.map((sk) => sk.weaponTypeKey))];
}

/** Whether everything needed to render the current (page, lang) is already cached. */
function isLoaded(state: CharacterState): boolean {
  if (!state.data[state.lang]) return false;
  if (state.page === "mastery") return !!state.mastery[state.lang];
  if (state.page === "costumes") return !!state.costumes[state.lang];
  if (state.page === "potential") return !!state.potential[state.lang];
  return true;
}

/** Fetch (lazily) the base + section data needed for the current (page, lang). */
async function ensure(state: CharacterState, api: ApiClient): Promise<void> {
  if (!state.data[state.lang]) state.data[state.lang] = await api.getCharacter(state.slug, state.lang);
  if (state.page === "mastery" && !state.mastery[state.lang]) {
    state.mastery[state.lang] = await api.getMastery(state.slug, state.lang);
  } else if (state.page === "costumes" && !state.costumes[state.lang]) {
    state.costumes[state.lang] = await api.getCostumes(state.slug, state.lang);
  } else if (state.page === "potential" && !state.potential[state.lang]) {
    state.potential[state.lang] = await api.getPotential(state.slug, state.lang);
  }
}

// ── Header ──────────────────────────────────────────────────────────

function addHeader(container: ContainerBuilder, char: CharacterData): void {
  const badge = rarityBadge(char.rarity);
  const lines = [
    `# ${badge ? `${badge} ` : ""}${char.name}`,
    `${elemEmoji(char.elementKey)} **${char.element}**  •  ${char.role}`,
  ];
  if (char.nameEn && char.nameEn !== char.name) lines.push(`-# ${char.nameEn}`);

  const text = new TextDisplayBuilder().setContent(lines.join("\n"));
  if (char.imageUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(text)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(char.imageUrl)),
    );
  } else {
    container.addTextDisplayComponents(text);
  }
}

// ── Page : Overview ─────────────────────────────────────────────────

function addOverview(container: ContainerBuilder, char: CharacterData, lang: Lang): void {
  const s = char.stats;

  const statsTitle = char.statsLevel
    ? `### 📊 ${L(lang, "Statistiques", "Stats")} · ${L(lang, "Niv.", "Lv.")}${char.statsLevel}`
    : `### 📊 ${L(lang, "Statistiques", "Stats")}`;

  const left: [string, string][] = [
    [L(lang, "PV", "HP"), fmtMono(s.hp)],
    ["ATK", fmtMono(s.atk)],
    ["DEF", fmtMono(s.def)],
    [L(lang, "Vitesse", "Speed"), fmtMono(s.spd)],
  ];
  const right: [string, string][] = [];
  if (s.critRate) right.push(["Crit", pct(s.critRate)]);
  if (s.critDamage) right.push([L(lang, "Dmg Crit", "Crit Dmg"), pct(s.critDamage)]);
  if (s.accuracy) right.push([L(lang, "Précision", "Accuracy"), pct(s.accuracy)]);
  if (s.block) right.push([L(lang, "Bloc", "Block"), pct(s.block)]);
  if (s.critResist) right.push([L(lang, "Rés. Crit", "Crit Res"), pct(s.critResist)]);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${statsTitle}\n\`\`\`\n${twoColTable(left, right)}\n\`\`\``),
  );

  if (char.weaponSlots.length > 0) {
    const lines = [`### 🗡️ ${L(lang, "Armes compatibles", "Compatible weapons")}`];
    for (const w of char.weaponSlots) {
      lines.push(`${weaponEmoji(w.weaponKey)} **${w.weapon}** · ${elemEmoji(w.elementKey)} ${w.element} · ${w.role}`);
    }
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  if (char.adventureSkill?.length > 0) {
    const lines = [`### 🏕️ ${L(lang, "Passif d'aventure", "Adventure passive")}`];
    for (const a of char.adventureSkill) {
      lines.push(`**${a.name}**`);
      if (a.description) lines.push(`-# ${clean(a.description)}`);
    }
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  if (char.bannerUrl) {
    container.addSeparatorComponents(sep());
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(char.bannerUrl)),
    );
  }
}

// ── Page : Skills ───────────────────────────────────────────────────

function addSkills(container: ContainerBuilder, char: CharacterData, weaponTypeKey: string, lang: Lang): void {
  const grouped = groupSkillsByWeapon(char.skills);
  const skills = grouped.get(weaponTypeKey) ?? [];
  const weaponLabel = skills[0]?.weaponType
    ?? char.weaponSlots.find((w) => w.weaponKey === weaponTypeKey)?.weapon
    ?? weaponTypeKey;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### ${weaponEmoji(weaponTypeKey)} ${weaponLabel}`),
  );

  if (skills.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(L(lang, "*Aucun skill pour cette arme.*", "*No skill for this weapon.*")),
    );
    return;
  }

  for (const sk of skills) {
    const meta: string[] = [];
    if (sk.damagePercent) meta.push(`💥 **${sk.damagePercent}**`);
    if (sk.hitCount && sk.hitCount > 0) meta.push(`🎯 **${sk.hitCount}** hit${sk.hitCount > 1 ? "s" : ""}`);
    if (sk.cooldown) meta.push(`⏱️ **${sk.cooldown}s**`);

    const lines = [`**${sk.category} — ${sk.name}**`];
    if (meta.length > 0) lines.push(meta.join("  •  "));
    if (sk.description) lines.push("```ansi\n" + colorize(sk.description) + "\n```"); // full, colored
    if (sk.buffs?.length) lines.push(sk.buffs.map((b) => `> 🔹 ${b.name}`).join("\n"));

    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }
}

// ── Page : Mastery ──────────────────────────────────────────────────

function materialLines(materials: { itemId: string; name: string; quantity: number }[]): string {
  return materials
    .map((m) => {
      const icon = getEmoji(`item_${m.itemId}`);
      return `${icon ?? "•"} ${m.name} **×${m.quantity}**`;
    })
    .join("\n") || "—";
}

function addMastery(container: ContainerBuilder, mastery: CharacterMastery | undefined, weaponKey: string, lang: Lang): void {
  if (!mastery || mastery.weapons.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(L(lang, "*Aucune maîtrise pour ce personnage.*", "*No mastery for this character.*")),
    );
    return;
  }

  const w = mastery.weapons.find((x) => x.weaponTypeKey === weaponKey) ?? mastery.weapons[0];

  const head = [`### 🔨 ${L(lang, "Maîtrise", "Mastery")} — ${weaponEmoji(w.weaponTypeKey)} ${w.weaponType}`];
  const cost = [`🪙 ${L(lang, "Or", "Gold")} **${fmtMono(w.goldTotal)}**`];
  if (w.currencyTotal > 0) cost.push(`💎 ${L(lang, "Devise", "Currency")} **${fmtMono(w.currencyTotal)}**`);
  head.push(cost.join("  •  "));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(head.join("\n")));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(materialLines(w.materials)));

  // Total across all weapons.
  container.addSeparatorComponents(sep());
  const totHead = [`### 🧮 ${L(lang, "Total — toutes armes", "Total — all weapons")}`];
  const totCost = [`🪙 ${L(lang, "Or", "Gold")} **${fmtMono(mastery.total.goldTotal)}**`];
  if (mastery.total.currencyTotal > 0) totCost.push(`💎 **${fmtMono(mastery.total.currencyTotal)}**`);
  totHead.push(totCost.join("  •  "));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(totHead.join("\n")));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(materialLines(mastery.total.materials)));
}

// ── Page : Costumes ─────────────────────────────────────────────────

// Max costumes rendered as icon+text sections, to stay under Discord's 40-component cap.
const COSTUME_LIMIT = 8;

function addCostumes(container: ContainerBuilder, data: CharacterCostumes | undefined, lang: Lang): void {
  // Only costumes that grant an engraving passive (skip cosmetic-only & default).
  const withPassive = data?.costumes.filter((c) => c.engravingPassives && c.engravingPassives.length > 0) ?? [];

  if (withPassive.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(L(lang, "*Aucun costume avec passif.*", "*No costume with a passive.*")),
    );
    return;
  }

  withPassive.slice(0, COSTUME_LIMIT).forEach((c, idx) => {
    if (idx > 0) container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));

    // Costume art (full image — Discord has no medium size between this and a tiny thumbnail).
    if (c.iconUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(c.iconUrl).setDescription(c.name)),
      );
    }

    // Name as an H2 (bigger rarity badge), effect as subtext, then the colored passive blocks.
    const badge = rarityBadge(c.rarity);
    const lines = [`## ${badge ? `${badge} ` : ""}${c.name}`];
    if (c.effectDesc) lines.push(`-# ${clean(c.effectDesc)}`);

    for (const ep of c.engravingPassives!) {
      lines.push(`🔹 **${ep.name}**`);
      const block = ep.levels
        .map((lv) => `Lv.${lv.level}  ${colorize(lv.description)}`)
        .join("\n\n");
      lines.push("```ansi\n" + block + "\n```");
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  });

  if (withPassive.length > COSTUME_LIMIT) {
    const more = withPassive.length - COSTUME_LIMIT;
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# +${more} ${L(lang, "autres costumes avec passif — voir la fiche complète", "more costumes with a passive — see full page")}`,
      ),
    );
  }
}

// ── Page : Potential ────────────────────────────────────────────────

function addPotential(container: ContainerBuilder, data: CharacterPotential | undefined, weaponKey: string, lang: Lang): void {
  if (!data || data.potentials.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(L(lang, "*Aucun potentiel pour ce personnage.*", "*No potential for this character.*")),
    );
    return;
  }

  const w = data.potentials.find((x) => x.weaponTypeKey === weaponKey) ?? data.potentials[0];
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 🌟 ${L(lang, "Potentiel", "Potential")} — ${weaponEmoji(w.weaponTypeKey)} ${w.weaponType}`),
  );

  const lines = w.tiers.map((t) => `**${L(lang, "Palier", "Tier")} ${t.tier}** · ${clean(t.bonus)}`);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
}

// ── Interactive rows ────────────────────────────────────────────────

function buildPageSelectRow(state: CharacterState): ActionRowBuilder<StringSelectMenuBuilder> {
  const char = getChar(state);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:page`)
    .setPlaceholder(L(state.lang, "Section", "Section"))
    .addOptions(
      PAGE_OPTIONS.map((p) => ({
        label: L(state.lang, p.fr, p.en),
        value: p.value,
        emoji: p.emoji,
        default: p.value === state.page,
      })),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildWeaponSelectRow(state: CharacterState): ActionRowBuilder<StringSelectMenuBuilder> {
  const char = getChar(state);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:weapon`)
    .setPlaceholder(L(state.lang, "Choisir une arme", "Select a weapon"))
    .addOptions(
      getWeaponTypes(char).map((wtKey) => {
        const slot = char.weaponSlots.find((w) => w.weaponKey === wtKey);
        const label = slot?.weapon
          ?? char.skills.find((sk) => sk.weaponTypeKey === wtKey)?.weaponType
          ?? wtKey;
        return { label, value: wtKey, emoji: parseEmoji(wtKey), default: wtKey === state.activeWeapon };
      }),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildLangSelectRow(state: CharacterState): ActionRowBuilder<StringSelectMenuBuilder> {
  const char = getChar(state);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:lang`)
    .setPlaceholder("🌐 Langue / Language")
    .addOptions(
      LANG_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
        emoji: opt.emoji,
        default: opt.value === state.lang,
      })),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildLinkRow(state: CharacterState): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel(L(state.lang, "Fiche complète", "Full page"))
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildContainer(state: CharacterState, expired = false): ContainerBuilder {
  const char = getChar(state);
  const color = ELEMENT_COLORS[char.elementKey] ?? RARITY_COLORS[char.rarity] ?? 0xc9a84c;
  const container = new ContainerBuilder().setAccentColor(color);

  addHeader(container, char);
  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));

  switch (state.page) {
    case "overview": addOverview(container, char, state.lang); break;
    case "skills": addSkills(container, char, state.activeWeapon, state.lang); break;
    case "mastery": addMastery(container, state.mastery[state.lang], state.activeWeapon, state.lang); break;
    case "costumes": addCostumes(container, state.costumes[state.lang], state.lang); break;
    case "potential": addPotential(container, state.potential[state.lang], state.activeWeapon, state.lang); break;
  }

  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));

  if (!expired) {
    container.addActionRowComponents(buildPageSelectRow(state));
    if (WEAPON_PAGES.includes(state.page) && getWeaponTypes(char).length > 1) {
      container.addActionRowComponents(buildWeaponSelectRow(state));
    }
    container.addActionRowComponents(buildLangSelectRow(state));
  }
  container.addActionRowComponents(buildLinkRow(state));

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# 7DS Origin · 7dsorigin.app"));

  return container;
}

const V2 = { flags: MessageFlags.IsComponentsV2 as const };

// ── Command definition ──────────────────────────────────────────────

export function buildCharacterCommand() {
  return new SlashCommandBuilder()
    .setName("character")
    .setDescription("Rechercher un personnage dans la base de données")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Nom du personnage (FR/EN)")
        .setRequired(true)
        .setAutocomplete(true),
    );
}

// ── Autocomplete ────────────────────────────────────────────────────

export async function handleCharacterAutocomplete(
  interaction: AutocompleteInteraction,
  apiClient: ApiClient,
) {
  const focused = interaction.options.getFocused();

  try {
    const results = await apiClient.searchCharacters(focused);
    await interaction.respond(
      results.slice(0, 25).map((c) => {
        const elem = ELEMENT_UNICODE[c.elementKey] ?? "";
        const label = c.name !== c.nameEn ? `${c.name} / ${c.nameEn}` : c.name;
        return { name: `${elem} ${label}  [${c.rarity}]`, value: c.slug };
      }),
    );
  } catch (err) {
    console.error("Autocomplete error:", err);
    await interaction.respond([]);
  }
}

// ── Execute command ─────────────────────────────────────────────────

const COLLECTOR_TIMEOUT = 5 * 60 * 1000;

export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
  apiClient: ApiClient,
) {
  const slug = interaction.options.getString("name", true);

  // Components V2 messages can't be created via deferReply (flag unsupported there),
  // so fetch the default language first, then reply directly.
  let fr: CharacterData;
  try {
    fr = await apiClient.getCharacter(slug, "fr");
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.reply({ content: "❌ Personnage introuvable ou erreur API.", flags: MessageFlags.Ephemeral });
    return;
  }

  const weaponTypes = getWeaponTypes(fr);
  const state: CharacterState = {
    data: { fr },
    mastery: {},
    costumes: {},
    potential: {},
    slug,
    lang: "fr",
    page: "overview",
    activeWeapon: weaponTypes[0] ?? "",
  };

  const response = await interaction.reply({ components: [buildContainer(state)], ...V2 });
  const collector = response.createMessageComponentCollector({ time: COLLECTOR_TIMEOUT });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: "Utilise `/character` pour ta propre recherche.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!i.isStringSelectMenu()) return; // only the select menus drive navigation

    const action = i.customId.split(":")[2];
    if (action === "page") state.page = i.values[0] as Page;
    else if (action === "weapon") state.activeWeapon = i.values[0];
    else if (action === "lang") state.lang = i.values[0] as Lang;
    else return;

    const needFetch = !isLoaded(state);
    if (needFetch) await i.deferUpdate();
    try {
      await ensure(state, apiClient);
    } catch (err) {
      console.error("Character section fetch error:", err);
      await i.followUp({ content: "❌ Erreur de chargement de cette section.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Keep the active weapon valid against the base data.
    const wt = getWeaponTypes(getChar(state));
    if (!state.activeWeapon || !wt.includes(state.activeWeapon)) state.activeWeapon = wt[0] ?? "";

    const payload = { components: [buildContainer(state)], ...V2 };
    if (needFetch) await interaction.editReply(payload);
    else await i.update(payload);
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [buildContainer(state, true)], ...V2 });
    } catch { /* message may have been deleted */ }
  });
}
