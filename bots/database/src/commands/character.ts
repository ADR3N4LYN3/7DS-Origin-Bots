import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
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

const FIELD_MAX = 1024;

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function pct(n: number): string {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

/** Truncate to Discord's 1024-char field limit without cutting a line in two. */
function clampField(value: string): string {
  if (value.length <= FIELD_MAX) return value;
  return value.slice(0, FIELD_MAX - 1).replace(/\n[^\n]*$/, "") + "…";
}

/** One stat row: `emoji Label · **value**`. */
function stat(emoji: string, label: string, value: string): string {
  return `${emoji} ${label} · **${value}**`;
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

function rarityEmoji(rarity: string): string {
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

// ── Shared header ───────────────────────────────────────────────────

function baseEmbed(char: CharacterData): EmbedBuilder {
  const color = ELEMENT_COLORS[char.elementKey] ?? RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  const header = [
    `${elemEmoji(char.elementKey)} **${char.element}**`,
    char.role,
    `${rarityEmoji(char.rarity)} **${char.rarity}**`.trim(),
  ].join("  •  ");

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(char.name)
    .setURL(char.url)
    .setDescription(header)
    .setThumbnail(char.imageUrl || null)
    .setFooter({ text: "7DS Origin · 7dsorigin.app" });

  // EN name as a discreet sub-line above the title.
  if (char.nameEn && char.nameEn !== char.name) {
    embed.setAuthor({ name: char.nameEn });
  }

  return embed;
}

// ── Page 1 : Overview ──────────────────────────────────────────────

function buildOverviewEmbed(char: CharacterData, lang: Lang): EmbedBuilder {
  const embed = baseEmbed(char);
  const s = char.stats;

  // Three balanced columns → clean stat-sheet grid.
  const survie = [stat("❤️", L(lang, "PV", "HP"), fmt(s.hp)), stat("🛡️", "DEF", fmt(s.def))];
  if (s.block) survie.push(stat("🧱", L(lang, "Bloc", "Block"), pct(s.block)));
  if (s.critResist) survie.push(stat("🪨", L(lang, "Rés. Crit", "Crit Res"), pct(s.critResist)));

  const attaque = [stat("⚔️", "ATK", fmt(s.atk))];
  if (s.critRate) attaque.push(stat("🎯", "Crit", pct(s.critRate)));
  if (s.critDamage) attaque.push(stat("💥", L(lang, "Dmg Crit", "Crit Dmg"), pct(s.critDamage)));

  const util = [stat("🏃", L(lang, "Vitesse", "Speed"), fmt(s.spd))];
  if (s.accuracy) util.push(stat("🎯", L(lang, "Précision", "Accuracy"), pct(s.accuracy)));

  const statsTitle = char.statsLevel
    ? L(lang, `📊 Stats (Niv.${char.statsLevel})`, `📊 Stats (Lv.${char.statsLevel})`)
    : "📊 Stats";

  embed.addFields(
    { name: statsTitle, value: `🛡️ **${L(lang, "Survie", "Survival")}**\n${survie.join("\n")}`, inline: true },
    { name: "​", value: `⚔️ **${L(lang, "Attaque", "Offense")}**\n${attaque.join("\n")}`, inline: true },
    { name: "​", value: `✨ **${L(lang, "Utilitaire", "Utility")}**\n${util.join("\n")}`, inline: true },
  );

  // Compatible weapons.
  const weaponLines = char.weaponSlots.map((w) =>
    `${weaponEmoji(w.weaponKey)} **${w.weapon}** · ${elemEmoji(w.elementKey)} ${w.element} · ${w.role}`,
  );
  embed.addFields({
    name: L(lang, "🗡️ Armes compatibles", "🗡️ Compatible weapons"),
    value: clampField(weaponLines.length > 0 ? weaponLines.join("\n") : "—"),
  });

  // Adventure passive.
  if (char.adventureSkill?.length > 0) {
    const advLines = char.adventureSkill.map((a) => {
      const d = clean(a.description).split("\n")[0].slice(0, 140);
      return `**${a.name}**\n-# ${d}`;
    });
    embed.addFields({
      name: L(lang, "🏕️ Passif d'aventure", "🏕️ Adventure passive"),
      value: clampField(advLines.join("\n\n")),
    });
  }

  if (char.bannerUrl) embed.setImage(char.bannerUrl);

  return embed;
}

// ── Page 2 : Skills ────────────────────────────────────────────────

function buildSkillsEmbed(char: CharacterData, weaponTypeKey: string, lang: Lang): EmbedBuilder {
  const embed = baseEmbed(char);
  const grouped = groupSkillsByWeapon(char.skills);
  const skills = grouped.get(weaponTypeKey) ?? [];

  const weaponLabel = skills[0]?.weaponType
    ?? char.weaponSlots.find((w) => w.weaponKey === weaponTypeKey)?.weapon
    ?? weaponTypeKey;

  embed.addFields({
    name: `${weaponEmoji(weaponTypeKey)} ${weaponLabel}`,
    value: L(lang, "*Compétences liées à cette arme*", "*Skills tied to this weapon*"),
  });

  if (skills.length > 0) {
    for (const sk of skills) {
      const meta: string[] = [];
      if (sk.damagePercent) meta.push(`💥 **${sk.damagePercent}**`);
      if (sk.hitCount && sk.hitCount > 0) meta.push(`🎯 **${sk.hitCount}** hit${sk.hitCount > 1 ? "s" : ""}`);
      if (sk.cooldown) meta.push(`⏱️ **${sk.cooldown}s**`);
      const metaLine = meta.length > 0 ? meta.join("  •  ") + "\n" : "";

      const desc = sk.description
        ? `-# ${clean(sk.description).split("\n")[0].slice(0, 220)}\n`
        : "";

      const buffs = sk.buffs?.length
        ? sk.buffs.map((b) => `> 🔹 ${b.name}`).join("\n")
        : "";

      embed.addFields({
        name: `${sk.category} — ${sk.name}`,
        value: clampField(`${metaLine}${desc}${buffs}`.trim() || "​"),
      });
    }
  } else {
    embed.addFields({
      name: L(lang, "Aucune compétence", "No skills"),
      value: L(lang, "*Aucun skill pour cette arme.*", "*No skill for this weapon.*"),
    });
  }

  return embed;
}

// ── Components ──────────────────────────────────────────────────────

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

function buildButtonRow(state: CharacterState): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:overview`)
      .setLabel(L(state.lang, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(state.page === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "overview"),
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:skills`)
      .setLabel(L(state.lang, "Compétences", "Skills"))
      .setEmoji("⚔️")
      .setStyle(state.page === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "skills"),
    new ButtonBuilder()
      .setLabel(L(state.lang, "Fiche complète", "Full page"))
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
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

function buildWeaponSelectRow(state: CharacterState): ActionRowBuilder<StringSelectMenuBuilder> {
  const char = getChar(state);
  const weaponTypes = getWeaponTypes(char);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:weapon`)
    .setPlaceholder(L(state.lang, "Choisir une arme", "Select a weapon"))
    .addOptions(
      weaponTypes.map((wtKey) => {
        const slot = char.weaponSlots.find((w) => w.weaponKey === wtKey);
        const label = slot?.weapon
          ?? char.skills.find((sk) => sk.weaponTypeKey === wtKey)?.weaponType
          ?? wtKey;

        return {
          label,
          value: wtKey,
          emoji: parseEmoji(wtKey),
          default: wtKey === state.activeWeapon,
        };
      }),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildComponents(
  state: CharacterState,
): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
  const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [
    buildButtonRow(state),
  ];

  if (state.page === "skills" && getWeaponTypes(getChar(state)).length > 1) {
    rows.push(buildWeaponSelectRow(state));
  }

  rows.push(buildLangSelectRow(state));

  return rows;
}

function buildExpiredComponents(state: CharacterState): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("char:expired:overview")
      .setLabel(L(state.lang, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("char:expired:skills")
      .setLabel(L(state.lang, "Compétences", "Skills"))
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setLabel(L(state.lang, "Fiche complète", "Full page"))
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildCurrentEmbed(state: CharacterState): EmbedBuilder {
  const char = getChar(state);
  return state.page === "overview"
    ? buildOverviewEmbed(char, state.lang)
    : buildSkillsEmbed(char, state.activeWeapon, state.lang);
}

// ── Command definition ──────────────────────────────────────────────

export function buildCharacterCommand() {
  return new SlashCommandBuilder()
    .setName("character")
    .setDescription("Rechercher un personnage dans la base de données")
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
  await interaction.deferReply();

  let fr: CharacterData;
  try {
    fr = await apiClient.getCharacter(slug, "fr");
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.editReply({ content: "❌ Personnage introuvable ou erreur API." });
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

  const reply = await interaction.editReply({
    embeds: [buildCurrentEmbed(state)],
    components: buildComponents(state),
  });

  const collector = reply.createMessageComponentCollector({ time: COLLECTOR_TIMEOUT });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: "Utilise `/character` pour ta propre recherche.", flags: 64 });
      return;
    }

    if (i.isButton()) {
      const action = i.customId.split(":")[2];
      if (action === "overview") state.page = "overview";
      else if (action === "skills") state.page = "skills";
      await i.update({ embeds: [buildCurrentEmbed(state)], components: buildComponents(state) });
      return;
    }

    if (i.isStringSelectMenu()) {
      const action = i.customId.split(":")[2];

      if (action === "weapon") {
        state.activeWeapon = i.values[0];
        await i.update({ embeds: [buildCurrentEmbed(state)], components: buildComponents(state) });
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
          await i.followUp({ content: "❌ Erreur de chargement de cette langue.", flags: 64 });
          return;
        }

        state.lang = newLang;
        const wt = getWeaponTypes(getChar(state));
        if (!wt.includes(state.activeWeapon)) state.activeWeapon = wt[0] ?? "";

        const payload = { embeds: [buildCurrentEmbed(state)], components: buildComponents(state) };
        if (needFetch) await interaction.editReply(payload);
        else await i.update(payload);
      }
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [buildExpiredComponents(state)] });
    } catch { /* message may have been deleted */ }
  });
}
