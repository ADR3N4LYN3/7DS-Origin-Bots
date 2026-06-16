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
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
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
  grade2: "PotCommon",
  grade3: "PotRare",
  grade4: "PotEpic",
  grade5: "PotLeg",
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

// ── Helpers ─────────────────────────────────────────────────────────

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

/** Inline rarity badge emoji (rendered slightly larger inside the `#` title). */
function rarityBadge(rarity: string): string {
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

function sep(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
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

/** UI label localization — FR for "fr", EN otherwise (ES/DE/PT fall back to EN UI). */
function L(lang: Lang, fr: string, en: string): string {
  return lang === "fr" ? fr : en;
}

interface PetState {
  data: Partial<Record<Lang, PetData>>; // lazily filled per language
  slug: string;
  lang: Lang;
  page: Page;
}

function getPet(state: PetState): PetData {
  return state.data[state.lang]!;
}

// ── Container sections (Components V2) ──────────────────────────────

function addHeader(container: ContainerBuilder, pet: PetData): void {
  const badge = rarityBadge(pet.rarity);
  const lines = [
    `# ${badge ? `${badge} ` : ""}${pet.name}`,
    `${petTypeEmoji(pet.petTypeKey)} **${pet.petType}**`,
  ];
  if (pet.nameEn && pet.nameEn !== pet.name) lines.push(`-# ${pet.nameEn}`);

  const text = new TextDisplayBuilder().setContent(lines.join("\n"));

  if (pet.imageUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(text)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(pet.imageUrl)),
    );
  } else {
    container.addTextDisplayComponents(text);
  }
}

function addOverview(container: ContainerBuilder, pet: PetData, lang: Lang): void {
  // ── Infos générales ──
  const info = [`### 📋 ${L(lang, "Informations", "Info")}`];
  info.push(`${obtainEmoji(pet.obtainMethodKey)} ${L(lang, "Obtention", "Obtain")} · **${pet.obtainMethod}**`);
  if (pet.autolootTypeKey && pet.autolootType) {
    info.push(`${autolootEmoji(pet.autolootTypeKey)} Autoloot · **${pet.autolootType}**`);
  }
  info.push(`🐎 ${L(lang, "Montable", "Mountable")} · **${pet.mountable ? L(lang, "Oui", "Yes") : L(lang, "Non", "No")}**`);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info.join("\n")));

  // ── Vitesses ──
  const s = pet.speeds;
  const speeds: string[] = [];
  if (s.walk != null) speeds.push(`🚶 ${L(lang, "Marche", "Walk")} **${fmt(s.walk)}**`);
  if (s.run != null) speeds.push(`🏃 ${L(lang, "Course", "Run")} **${fmt(s.run)}**`);
  if (s.fly != null) speeds.push(`🦅 ${L(lang, "Vol", "Fly")} **${fmt(s.fly)}**`);
  if (s.glide != null) speeds.push(`🪂 ${L(lang, "Planage", "Glide")} **${fmt(s.glide)}**`);
  if (s.stamina != null) speeds.push(`⚡ ${L(lang, "Endurance", "Stamina")} **${fmt(s.stamina)}**`);
  if (speeds.length > 0) {
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 🏁 ${L(lang, "Vitesses", "Speeds")}\n${speeds.join("  •  ")}`),
    );
  }

  // ── Nourriture ──
  if (pet.feedItem?.name) {
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 🍖 ${L(lang, "Nourriture", "Feed")}\n${pet.feedItem.name}`),
    );
  }

  // ── Sources ──
  if (pet.obtainSources.length > 0) {
    const lines = [`### 📍 ${L(lang, "Sources d'obtention", "Obtain sources")}`];
    for (const src of pet.obtainSources) {
      const icon = SOURCE_UNICODE[src.type] ?? "📍";
      const meta = src.metadata;
      const extras: string[] = [];
      if (src.type === "SHOP" && meta?.price != null) {
        extras.push(`💰 ${fmt(meta.price)}${meta.currency ? ` ${meta.currency}` : ""}`);
      }
      if (src.type === "DUNGEON" && meta?.worldLevel != null) extras.push(`Lv.${meta.worldLevel}`);
      const suffix = extras.length > 0 ? ` · ${extras.join(" · ")}` : "";
      lines.push(`${icon} ${src.label}${suffix}`);
    }
    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  // ── Capture ──
  if (pet.captureData && (pet.captureData.difficulty != null || pet.captureData.baseRate != null)) {
    const lines = [`### 🎯 ${L(lang, "Capture", "Capture")}`];
    const head: string[] = [];
    if (pet.captureData.difficulty != null) head.push(`🎚️ ${L(lang, "Difficulté", "Difficulty")} **${pet.captureData.difficulty}**`);
    if (pet.captureData.baseRate != null) head.push(`📈 ${L(lang, "Taux de base", "Base rate")} **${pet.captureData.baseRate}%**`);
    if (pet.captureData.resistance != null) head.push(`🛡️ ${L(lang, "Résistance", "Resistance")} **${pet.captureData.resistance}%**`);
    if (head.length > 0) lines.push(head.join("  •  "));

    const potions = (pet.captureData.potions ?? []).slice().sort((a, b) => {
      const gradeNum = (g: string) => parseInt(g.replace("grade", ""), 10) || 0;
      return gradeNum(a.grade) - gradeNum(b.grade);
    });
    for (const p of potions) {
      const gradeEmojiName = POTION_GRADE_EMOJI_NAMES[p.grade];
      const icon = getEmoji(p.gameId) ?? (gradeEmojiName && getEmoji(gradeEmojiName)) ?? "🧪";
      lines.push(`${icon} ${p.name} → **${p.finalRate}%**`);
    }

    container.addSeparatorComponents(sep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }
}

function addSkills(container: ContainerBuilder, pet: PetData, lang: Lang): void {
  for (const sk of pet.activeSkills) {
    const lines = [`**⚡ ${sk.name}**`];
    if (sk.description) lines.push(clean(sk.description)); // full description, untruncated
    if (sk.buffs.length > 0) lines.push(sk.buffs.map((b) => `> 🔹 ${b.name}`).join("\n"));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
    container.addSeparatorComponents(sep());
  }

  if (pet.passiveSkill) {
    const p = pet.passiveSkill;
    const lines = [`**✨ ${L(lang, "Passif", "Passive")} — ${p.name}**`];
    if (p.description) lines.push(clean(p.description));
    if (p.buffs.length > 0) lines.push(p.buffs.map((b) => `> 🔹 ${b.name}`).join("\n"));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
  }

  if (pet.activeSkills.length === 0 && !pet.passiveSkill) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(L(lang, "*Ce familier n'a pas de compétences.*", "*This pet has no skills.*")),
    );
  }
}

// ── Interactive rows ────────────────────────────────────────────────

function buildButtonRow(state: PetState, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const pet = getPet(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet:${pet.slug}:overview`)
      .setLabel(L(state.lang, "Vue d'ensemble", "Overview"))
      .setEmoji("📊")
      .setStyle(state.page === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled || state.page === "overview"),
    new ButtonBuilder()
      .setCustomId(`pet:${pet.slug}:skills`)
      .setLabel(L(state.lang, "Compétences", "Skills"))
      .setEmoji("⚡")
      .setStyle(state.page === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled || state.page === "skills"),
    new ButtonBuilder()
      .setLabel(L(state.lang, "Fiche complète", "Full page"))
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

function buildContainer(state: PetState, expired = false): ContainerBuilder {
  const pet = getPet(state);
  const color = RARITY_COLORS[pet.rarity] ?? 0xc9a84c;
  const container = new ContainerBuilder().setAccentColor(color);

  addHeader(container, pet);
  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));

  if (state.page === "overview") addOverview(container, pet, state.lang);
  else addSkills(container, pet, state.lang);

  container.addSeparatorComponents(sep(SeparatorSpacingSize.Large));
  container.addActionRowComponents(buildButtonRow(state, expired));
  if (!expired) container.addActionRowComponents(buildLangSelectRow(state));

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# 7DS Origin · 7dsorigin.app"));

  return container;
}

const V2 = { flags: MessageFlags.IsComponentsV2 as const };

// ── Command definition ──────────────────────────────────────────────

export function buildPetCommand() {
  return new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Rechercher un familier/monture dans la base de données")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
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

  // Components V2 messages can't be created via deferReply (flag unsupported there),
  // so fetch the default language first, then reply directly.
  let fr: PetData;
  try {
    fr = await apiClient.getPet(slug, "fr");
  } catch (err) {
    console.error("Pet fetch error:", err);
    await interaction.reply({ content: "❌ Familier introuvable ou erreur API.", flags: MessageFlags.Ephemeral });
    return;
  }

  const state: PetState = { data: { fr }, slug, lang: "fr", page: "overview" };

  const response = await interaction.reply({ components: [buildContainer(state)], ...V2 });
  const collector = response.createMessageComponentCollector({ time: COLLECTOR_TIMEOUT });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: "Utilise `/pet` pour ta propre recherche.", flags: MessageFlags.Ephemeral });
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
      if (action !== "lang") return;

      const newLang = i.values[0] as Lang;
      const needFetch = !state.data[newLang];

      // Languages are fetched on demand (1 API call up-front, not 5).
      if (needFetch) await i.deferUpdate();
      try {
        if (needFetch) state.data[newLang] = await apiClient.getPet(slug, newLang);
      } catch (err) {
        console.error("Pet lang fetch error:", err);
        await i.followUp({ content: "❌ Erreur de chargement de cette langue.", flags: MessageFlags.Ephemeral });
        return;
      }

      state.lang = newLang;
      const payload = { components: [buildContainer(state)], ...V2 };
      if (needFetch) await interaction.editReply(payload);
      else await i.update(payload);
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [buildContainer(state, true)], ...V2 });
    } catch { /* message may have been deleted */ }
  });
}
