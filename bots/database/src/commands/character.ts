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
import type { CharacterData, CharacterSkill } from "../api/types.js";
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

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function pct(n: number): string {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
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

type Page = "overview" | "skills";

interface CharacterState {
  data: Partial<Record<Lang, CharacterData>>; // lazily filled per language
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

// ── Container sections (Components V2) ──────────────────────────────

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

function addOverview(container: ContainerBuilder, char: CharacterData, lang: Lang): void {
  const s = char.stats;

  const statsTitle = char.statsLevel
    ? `### 📊 ${L(lang, "Statistiques", "Stats")} · ${L(lang, "Niv.", "Lv.")}${char.statsLevel}`
    : `### 📊 ${L(lang, "Statistiques", "Stats")}`;

  const primary = [
    `❤️ ${L(lang, "PV", "HP")} **${fmt(s.hp)}**`,
    `⚔️ ATK **${fmt(s.atk)}**`,
    `🛡️ DEF **${fmt(s.def)}**`,
    `🏃 ${L(lang, "Vitesse", "Speed")} **${fmt(s.spd)}**`,
  ].join("  •  ");

  const secondary: string[] = [];
  if (s.critRate) secondary.push(`🎯 Crit **${pct(s.critRate)}**`);
  if (s.critDamage) secondary.push(`💥 ${L(lang, "Dmg Crit", "Crit Dmg")} **${pct(s.critDamage)}**`);
  if (s.accuracy) secondary.push(`✨ ${L(lang, "Précision", "Accuracy")} **${pct(s.accuracy)}**`);
  if (s.block) secondary.push(`🧱 ${L(lang, "Bloc", "Block")} **${pct(s.block)}**`);
  if (s.critResist) secondary.push(`🪨 ${L(lang, "Rés. Crit", "Crit Res")} **${pct(s.critResist)}**`);

  const statLines = [statsTitle, primary];
  if (secondary.length > 0) statLines.push(secondary.join("  •  "));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statLines.join("\n")));

  // Compatible weapons.
  if (char.weaponSlots.length > 0) {
    const lines = [`### 🗡️ ${L(lang, "Armes compatibles", "Compatible weapons")}`];
    for (const w of char.weaponSlots) {
      lines.push(`${weaponEmoji(w.weaponKey)} **${w.weapon}** · ${elemEmoji(w.elementKey)} ${w.element} · ${w.role}`);
    }
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  // Adventure passive — full text, no truncation.
  if (char.adventureSkill?.length > 0) {
    const lines = [`### 🏕️ ${L(lang, "Passif d'aventure", "Adventure passive")}`];
    for (const a of char.adventureSkill) {
      lines.push(`**${a.name}**`);
      if (a.description) lines.push(`-# ${clean(a.description)}`);
    }
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  // Banner as a full-width media gallery.
  if (char.bannerUrl) {
    container.addSeparatorComponents(sep());
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(char.bannerUrl)),
    );
  }
}

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
    if (sk.description) lines.push(clean(sk.description)); // full description, untruncated
    if (sk.buffs?.length) lines.push(sk.buffs.map((b) => `> 🔹 ${b.name}`).join("\n"));

    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }
}

// ── Interactive rows ────────────────────────────────────────────────

function buildButtonRow(state: CharacterState, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:overview`)
      .setLabel(L(state.lang, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(state.page === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled || state.page === "overview"),
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:skills`)
      .setLabel(L(state.lang, "Compétences", "Skills"))
      .setEmoji("⚔️")
      .setStyle(state.page === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled || state.page === "skills"),
    new ButtonBuilder()
      .setLabel(L(state.lang, "Fiche complète", "Full page"))
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
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

function buildContainer(state: CharacterState, expired = false): ContainerBuilder {
  const char = getChar(state);
  const color = ELEMENT_COLORS[char.elementKey] ?? RARITY_COLORS[char.rarity] ?? 0xc9a84c;
  const container = new ContainerBuilder().setAccentColor(color);

  addHeader(container, char);
  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));

  if (state.page === "overview") addOverview(container, char, state.lang);
  else addSkills(container, char, state.activeWeapon, state.lang);

  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));
  container.addActionRowComponents(buildButtonRow(state, expired));

  if (!expired) {
    if (state.page === "skills" && getWeaponTypes(char).length > 1) {
      container.addActionRowComponents(buildWeaponSelectRow(state));
    }
    container.addActionRowComponents(buildLangSelectRow(state));
  }

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

    if (i.isButton()) {
      const action = i.customId.split(":")[2];
      if (action === "overview") state.page = "overview";
      else if (action === "skills") state.page = "skills";
      await i.update({ components: [buildContainer(state)], ...V2 });
      return;
    }

    if (i.isStringSelectMenu()) {
      const action = i.customId.split(":")[2];

      if (action === "weapon") {
        state.activeWeapon = i.values[0];
        await i.update({ components: [buildContainer(state)], ...V2 });
        return;
      }

      if (action === "lang") {
        const newLang = i.values[0] as Lang;
        const needFetch = !state.data[newLang];

        // Languages are fetched on demand (1 API call up-front, not 5).
        if (needFetch) await i.deferUpdate();
        try {
          if (needFetch) state.data[newLang] = await apiClient.getCharacter(slug, newLang);
        } catch (err) {
          console.error("Character lang fetch error:", err);
          await i.followUp({ content: "❌ Erreur de chargement de cette langue.", flags: MessageFlags.Ephemeral });
          return;
        }

        state.lang = newLang;
        const wt = getWeaponTypes(getChar(state));
        if (!wt.includes(state.activeWeapon)) state.activeWeapon = wt[0] ?? "";

        const payload = { components: [buildContainer(state)], ...V2 };
        if (needFetch) await interaction.editReply(payload);
        else await i.update(payload);
      }
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [buildContainer(state, true)], ...V2 });
    } catch { /* message may have been deleted */ }
  });
}
