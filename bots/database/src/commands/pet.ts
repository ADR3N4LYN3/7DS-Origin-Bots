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
import type { PetData } from "../api/types.js";
import { getEmoji } from "../utils/botEmojis.js";

// ── Key → emoji name mappings ───────────────────────────────────────

const PET_TYPE_UNICODE: Record<string, string> = {
  RIDING: "🐎",
  GLIDING: "🪂",
  FLYING: "🦅",
  SUMMON: "✨",
};

const OBTAIN_UNICODE: Record<string, string> = {
  CAPTURE: "🎯",
  FEED: "🍖",
  MONSTER_DROP: "💀",
  DUNGEON: "🏰",
  QUEST: "📜",
  SHOP: "🛒",
  FISHING: "🎣",
  DEFAULT: "❓",
  OTHER: "❓",
};

const AUTOLOOT_UNICODE: Record<string, string> = {
  DROP: "📦",
  MINING: "⛏️",
  COLLECTION: "🌿",
};

const SOURCE_UNICODE: Record<string, string> = {
  MONSTER_DROP: "💀",
  DUNGEON: "🏰",
  QUEST: "📜",
  SHOP: "🛒",
  CODEX: "📖",
  EVENT: "🎉",
  FISHING: "🎣",
  FIELD_BOSS: "👹",
  MISSION: "🎯",
};

// Potion grade → application emoji name
const POTION_GRADE_EMOJI_NAMES: Record<string, string> = {
  grade2: "popobase",
  grade3: "popobleue",
  grade4: "popoepic",
  grade5: "popoleg",
};

const RARITY_COLORS: Record<string, number> = {
  SSR: 0xffd700, SR: 0xc084fc, R: 0x60a5fa,
};

const RARITY_EMOJI_NAMES: Record<string, string> = {
  SSR: "badge_ssr",
  SR: "badge_sr",
};

// ── Helpers ─────────────────────────────────────────────────────────

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

function tree(items: string[]): string {
  return items.map((item, i) =>
    `${i < items.length - 1 ? "├" : "└"} ${item}`,
  ).join("\n");
}

function rarityEmoji(rarity: string): string {
  const name = RARITY_EMOJI_NAMES[rarity];
  return (name && getEmoji(name)) || "";
}

function petTypeEmoji(key: string): string {
  return PET_TYPE_UNICODE[key] ?? "🐾";
}

function obtainEmoji(key: string): string {
  return OBTAIN_UNICODE[key] ?? "❓";
}

function autolootEmoji(key: string | null): string {
  if (!key) return "";
  return AUTOLOOT_UNICODE[key] ?? "📦";
}

// ── Lang ────────────────────────────────────────────────────────────

type Lang = "fr" | "en" | "es" | "de" | "pt";
type Page = "overview" | "skills";

const LANG_OPTIONS: { value: Lang; label: string; emoji: string }[] = [
  { value: "fr", label: "Français",   emoji: "🇫🇷" },
  { value: "en", label: "English",    emoji: "🇬🇧" },
  { value: "es", label: "Español",    emoji: "🇪🇸" },
  { value: "de", label: "Deutsch",    emoji: "🇩🇪" },
  { value: "pt", label: "Português",  emoji: "🇵🇹" },
];

interface PetState {
  data: Record<Lang, PetData>;
  lang: Lang;
  page: Page;
}

function getPet(state: PetState): PetData {
  return state.data[state.lang];
}

function L(state: PetState, fr: string, en: string): string {
  // FR for "fr", EN for everything else (ES/DE/PT fallback to EN UI)
  return state.lang === "fr" ? fr : en;
}

// ── Shared header ──────────────────────────────────────────────────

function baseEmbed(state: PetState): EmbedBuilder {
  const pet = getPet(state);
  const color = RARITY_COLORS[pet.rarity] ?? 0xc9a84c;

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${petTypeEmoji(pet.petTypeKey)} ${pet.petType} ${rarityEmoji(pet.rarity)}\n\n**${pet.name}**`)
    .setThumbnail(pet.imageUrl || null)
    .setFooter({ text: "7DS Origin · 7dsorigin.app" });
}

// ── Page 1 : Overview ──────────────────────────────────────────────

function buildOverviewEmbed(state: PetState): EmbedBuilder {
  const pet = getPet(state);
  const embed = baseEmbed(state);

  // ── Info générale ──
  const infoItems = [
    `${obtainEmoji(pet.obtainMethodKey)} ${L(state, "Obtention", "Obtain")} : **${pet.obtainMethod}**`,
  ];
  if (pet.autolootTypeKey && pet.autolootType) {
    infoItems.push(`${autolootEmoji(pet.autolootTypeKey)} ${L(state, "Autoloot", "Autoloot")} : **${pet.autolootType}**`);
  }
  if (pet.mountable) {
    infoItems.push(`🐎 ${L(state, "Montable", "Mountable")} : **${L(state, "Oui", "Yes")}**`);
  }
  embed.addFields({
    name: L(state, "📋 Informations", "📋 Info"),
    value: tree(infoItems),
  });

  // ── Vitesses (API returns player-facing values directly) ──
  const speedItems: string[] = [];
  const s = pet.speeds;
  if (s.walk != null) speedItems.push(`🚶 ${L(state, "Marche", "Walk")} **${fmt(s.walk)}**`);
  if (s.run != null) speedItems.push(`🏃 ${L(state, "Course", "Run")} **${fmt(s.run)}**`);
  if (s.fly != null) speedItems.push(`🦅 ${L(state, "Vol", "Fly")} **${fmt(s.fly)}**`);
  if (s.glide != null) speedItems.push(`🪂 ${L(state, "Planage", "Glide")} **${fmt(s.glide)}**`);
  if (s.stamina != null) speedItems.push(`⚡ ${L(state, "Endurance", "Stamina")} **${fmt(s.stamina)}**`);

  if (speedItems.length > 0) {
    embed.addFields({
      name: L(state, "🏁 Vitesses", "🏁 Speeds"),
      value: tree(speedItems),
    });
  }

  // ── Feed item ──
  if (pet.feedItem?.name) {
    embed.addFields({
      name: L(state, "🍖 Nourriture", "🍖 Feed"),
      value: `> ${pet.feedItem.name}`,
    });
  }

  // ── Sources d'obtention détaillées ──
  if (pet.obtainSources.length > 0) {
    const sourceLines = pet.obtainSources.slice(0, 5).map((src) => {
      const icon = SOURCE_UNICODE[src.type] ?? "📍";
      const meta = src.metadata;
      const extras: string[] = [];

      if (src.type === "SHOP" && meta?.price != null) {
        extras.push(`💰 ${fmt(meta.price)}${meta.currency ? ` ${meta.currency}` : ""}`);
      }
      if (src.type === "DUNGEON" && meta?.worldLevel != null) {
        extras.push(`Lv.${meta.worldLevel}`);
      }

      const suffix = extras.length > 0 ? ` · ${extras.join(" · ")}` : "";
      return `${icon} ${src.label}${suffix}`;
    });

    embed.addFields({
      name: L(state, "📍 Sources", "📍 Sources"),
      value: tree(sourceLines).slice(0, 1024),
    });
  }

  // ── Capture data (si applicable) ──
  if (pet.captureData && (pet.captureData.difficulty != null || pet.captureData.baseRate != null)) {
    const cap: string[] = [];
    if (pet.captureData.difficulty != null) cap.push(`${L(state, "Difficulté", "Difficulty")} **${pet.captureData.difficulty}**`);
    if (pet.captureData.baseRate != null) cap.push(`${L(state, "Taux base", "Base rate")} **${pet.captureData.baseRate}%**`);
    if (pet.captureData.resistance != null) cap.push(`${L(state, "Résistance", "Resistance")} **${pet.captureData.resistance}%**`);

    // Sort potions by grade ascending (grade2 → grade5) for display
    const potions = (pet.captureData.potions ?? []).slice().sort((a, b) => {
      const gradeNum = (g: string) => parseInt(g.replace("grade", ""), 10) || 0;
      return gradeNum(a.grade) - gradeNum(b.grade);
    });

    for (const p of potions) {
      const gradeEmojiName = POTION_GRADE_EMOJI_NAMES[p.grade];
      const icon = getEmoji(p.gameId) ?? (gradeEmojiName && getEmoji(gradeEmojiName)) ?? "🧪";
      cap.push(`${icon} ${p.name} → **${p.finalRate}%**`);
    }

    embed.addFields({
      name: L(state, "🎯 Capture", "🎯 Capture"),
      value: tree(cap),
    });
  }

  return embed;
}

// ── Page 2 : Skills ────────────────────────────────────────────────

function buildSkillsEmbed(state: PetState): EmbedBuilder {
  const pet = getPet(state);
  const embed = baseEmbed(state);

  // ── Skills actifs ──
  if (pet.activeSkills.length > 0) {
    for (const sk of pet.activeSkills) {
      const desc = sk.description
        ? `> ${clean(sk.description).split("\n")[0].slice(0, 200)}\n`
        : "";

      const buffs = sk.buffs.length > 0
        ? sk.buffs.map((b) => `├ 🟢 ${b.name}`).join("\n") + "\n"
        : "";

      embed.addFields({
        name: `⚡ ${sk.name}`,
        value: (`${desc}${buffs}`) || "\u200B",
      });
    }
  }

  // ── Skill passif ──
  if (pet.passiveSkill) {
    const p = pet.passiveSkill;
    const desc = p.description
      ? `> ${clean(p.description).split("\n")[0].slice(0, 200)}\n`
      : "";

    const buffs = p.buffs.length > 0
      ? p.buffs.map((b) => `├ 🟢 ${b.name}`).join("\n")
      : "";

    embed.addFields({
      name: L(state, `✨ Passif — ${p.name}`, `✨ Passive — ${p.name}`),
      value: (`${desc}${buffs}`) || "\u200B",
    });
  }

  if (pet.activeSkills.length === 0 && !pet.passiveSkill) {
    embed.addFields({
      name: L(state, "Aucun skill", "No skills"),
      value: L(state, "*Ce familier n'a pas de compétences.*", "*This pet has no skills.*"),
    });
  }

  return embed;
}

// ── Components ──────────────────────────────────────────────────────

function buildButtonRow(state: PetState): ActionRowBuilder<ButtonBuilder> {
  const pet = getPet(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet:${pet.slug}:overview`)
      .setLabel(L(state, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(state.page === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "overview"),
    new ButtonBuilder()
      .setCustomId(`pet:${pet.slug}:skills`)
      .setLabel(L(state, "Compétences", "Skills"))
      .setEmoji("⚡")
      .setStyle(state.page === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "skills"),
    new ButtonBuilder()
      .setLabel(L(state, "Fiche complète", "Full page"))
      .setURL(pet.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildLangSelectRow(state: PetState): ActionRowBuilder<StringSelectMenuBuilder> {
  const pet = getPet(state);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`pet:${pet.slug}:lang`)
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

function buildComponents(
  state: PetState,
): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
  return [buildButtonRow(state), buildLangSelectRow(state)];
}

function buildExpiredComponents(state: PetState): ActionRowBuilder<ButtonBuilder> {
  const pet = getPet(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("pet:expired:overview")
      .setLabel(L(state, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("pet:expired:skills")
      .setLabel(L(state, "Compétences", "Skills"))
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setLabel(L(state, "Fiche complète", "Full page"))
      .setURL(pet.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildCurrentEmbed(state: PetState): EmbedBuilder {
  return state.page === "overview"
    ? buildOverviewEmbed(state)
    : buildSkillsEmbed(state);
}

// ── Command definition ──────────────────────────────────────────────

export function buildPetCommand() {
  return new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Rechercher un familier/monture dans la base de données")
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Nom du familier (FR/EN)")
        .setRequired(true)
        .setAutocomplete(true),
    );
}

// ── Autocomplete ────────────────────────────────────────────────────

export async function handlePetAutocomplete(
  interaction: AutocompleteInteraction,
  apiClient: ApiClient,
) {
  const focused = interaction.options.getFocused();

  try {
    const results = await apiClient.searchPets(focused);
    await interaction.respond(
      results.slice(0, 25).map((p) => {
        const icon = PET_TYPE_UNICODE[p.petTypeKey] ?? "🐾";
        const label = p.name !== p.nameEn ? `${p.name} / ${p.nameEn}` : p.name;
        return { name: `${icon} ${label}  [${p.rarity}]`, value: p.slug };
      }),
    );
  } catch (err) {
    console.error("Pet autocomplete error:", err);
    await interaction.respond([]);
  }
}

// ── Execute command ─────────────────────────────────────────────────

const COLLECTOR_TIMEOUT = 5 * 60 * 1000;

export async function handlePetCommand(
  interaction: ChatInputCommandInteraction,
  apiClient: ApiClient,
) {
  const slug = interaction.options.getString("name", true);
  await interaction.deferReply();

  try {
    const [fr, en, es, de, pt] = await Promise.all([
      apiClient.getPet(slug, "fr"),
      apiClient.getPet(slug, "en"),
      apiClient.getPet(slug, "es"),
      apiClient.getPet(slug, "de"),
      apiClient.getPet(slug, "pt"),
    ]);

    const state: PetState = {
      data: { fr, en, es, de, pt },
      lang: "fr",
      page: "overview",
    };

    const reply = await interaction.editReply({
      embeds: [buildCurrentEmbed(state)],
      components: buildComponents(state),
    });

    const collector = reply.createMessageComponentCollector({
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: "Utilise `/pet` pour ta propre recherche.", ephemeral: true });
        return;
      }

      if (i.isButton()) {
        const action = i.customId.split(":")[2];
        if (action === "overview") state.page = "overview";
        else if (action === "skills") state.page = "skills";
      } else if (i.isStringSelectMenu()) {
        const action = i.customId.split(":")[2];
        if (action === "lang") state.lang = i.values[0] as Lang;
      } else {
        return;
      }

      await i.update({
        embeds: [buildCurrentEmbed(state)],
        components: buildComponents(state),
      });
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [buildExpiredComponents(state)] });
      } catch { /* message may have been deleted */ }
    });
  } catch (err) {
    console.error("Pet fetch error:", err);
    await interaction.editReply({ content: "❌ Familier introuvable ou erreur API." });
  }
}
