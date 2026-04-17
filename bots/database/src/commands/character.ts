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

const RARITY_COLORS: Record<string, number> = {
  SSR: 0xffd700, SR: 0xc084fc, R: 0x60a5fa,
};

const RARITY_EMOJI_NAMES: Record<string, string> = {
  SSR: "badge_ssr",
  SR: "badge_sr",
};

const WEAPON_EMOJI_NAMES: Record<string, string> = {
  SWORD1H: "ItemDivision_sword1h",
  SWORDDUAL: "ItemDivision_sworddual",
  SWORD2H: "ItemDivision_sword2h",
  AXE: "ItemDivision_axe",
  STAFF: "ItemDivision_staff",
  LANCE: "ItemDivision_lance",
  RAPIER: "ItemDivision_rapier",
  SHIELD: "ItemDivision_shield",
  WAND: "ItemDivision_wand",
  BOOK: "ItemDivision_book",
  GAUNTLETS: "ItemDivision_gauntlets",
  CUDGEL3C: "ItemDivision_cudgel3c",
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

function tree(items: string[]): string {
  return items.map((item, i) =>
    `${i < items.length - 1 ? "├" : "└"} ${item}`,
  ).join("\n");
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

// ── Lang type ───────────────────────────────────────────────────────

type Lang = "fr" | "en";

// ── Shared header ───────────────────────────────────────────────────

function baseEmbed(char: CharacterData): EmbedBuilder {
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  const title = char.name !== char.nameEn
    ? `${char.name} [${char.nameEn}]`
    : char.name;

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${elemEmoji(char.elementKey)} ${char.element} · ${char.role} ${rarityEmoji(char.rarity)}\n\n**${title}**`)
    .setThumbnail(char.imageUrl || null)
    .setFooter({ text: "7DS Origin · 7dsorigin.app" });
}

// ── Page 1 : Overview ──────────────────────────────────────────────

function buildOverviewEmbed(char: CharacterData): EmbedBuilder {
  const embed = baseEmbed(char);
  const s = char.stats;

  const statsLabel = char.statsLevel ? `📊 Stats (Lv.${char.statsLevel})` : "📊 Stats";

  embed.addFields({
    name: statsLabel,
    value: tree([
      `❤️ PV **${fmt(s.hp)}**`,
      `⚔️ ATK **${fmt(s.atk)}**`,
      `🛡️ DEF **${fmt(s.def)}**`,
      `🏃 Vitesse **${fmt(s.spd)}**`,
    ]),
    inline: true,
  });

  const secItems: string[] = [];
  if (s.critRate) secItems.push(`Crit **${pct(s.critRate)}**`);
  if (s.critDamage) secItems.push(`Crit DMG **${pct(s.critDamage)}**`);
  if (s.accuracy) secItems.push(`Préc. **${pct(s.accuracy)}**`);
  if (s.block) secItems.push(`Bloc **${pct(s.block)}**`);

  if (secItems.length > 0) {
    embed.addFields({
      name: "📈 Secondaires",
      value: tree(secItems),
      inline: true,
    });
  }

  const weaponLines = char.weaponSlots.map((w) =>
    `${weaponEmoji(w.weaponKey)} ${w.weapon} · ${elemEmoji(w.elementKey)} ${w.element} · ${w.role}`,
  );

  embed.addFields({
    name: "🗡️ Armes compatibles",
    value: tree(weaponLines.length > 0 ? weaponLines : ["—"]),
  });

  if (char.adventureSkill?.length > 0) {
    const advLines = char.adventureSkill.map((a) => {
      const d = clean(a.description).split("\n")[0].slice(0, 120);
      return `**${a.name}**\n> *${d}*`;
    });

    embed.addFields({
      name: "🏕️ Passif d'aventure",
      value: tree(advLines),
    });
  }

  if (char.bannerUrl) {
    embed.setImage(char.bannerUrl);
  }

  return embed;
}

// ── Page 2 : Skills ────────────────────────────────────────────────

function buildSkillsEmbed(char: CharacterData, weaponTypeKey: string): EmbedBuilder {
  const embed = baseEmbed(char);
  const grouped = groupSkillsByWeapon(char.skills);
  const skills = grouped.get(weaponTypeKey) ?? [];

  // Find translated weapon name from first skill
  const weaponLabel = skills[0]?.weaponType
    ?? char.weaponSlots.find((w) => w.weaponKey === weaponTypeKey)?.weapon
    ?? weaponTypeKey;

  if (skills.length > 0) {
    for (const sk of skills) {
      const cd = sk.cooldown ? ` · CD ${sk.cooldown}s` : "";

      const statsParts: string[] = [];
      if (sk.damagePercent) statsParts.push(`**${sk.damagePercent}**`);
      if (sk.hitCount && sk.hitCount > 0) statsParts.push(`**${sk.hitCount}** hit${sk.hitCount > 1 ? "s" : ""}`);
      const statsLine = statsParts.length > 0
        ? statsParts.join(" × ") + "\n"
        : "";

      const desc = sk.description
        ? `> ${clean(sk.description).split("\n")[0].slice(0, 200)}\n`
        : "";

      const buffs = sk.buffs?.length
        ? sk.buffs.map((b) => `├ 🟢 ${b.nameFr}`).join("\n") + "\n"
        : "";

      embed.addFields({
        name: `${sk.category} — ${sk.name}${cd}`,
        value: `${statsLine}${desc}${buffs}` || "\u200B",
      });
    }
  } else {
    embed.addFields({
      name: `${weaponEmoji(weaponTypeKey)} ${weaponLabel}`,
      value: "*Aucun skill pour cette arme*",
    });
  }

  return embed;
}

// ── Components ──────────────────────────────────────────────────────

type Page = "overview" | "skills";

interface CharacterState {
  fr: CharacterData;
  en: CharacterData;
  lang: Lang;
  page: Page;
  activeWeapon: string; // weaponTypeKey
}

function getWeaponTypes(char: CharacterData): string[] {
  return [...new Set(char.skills.map((sk) => sk.weaponTypeKey))];
}

function getChar(state: CharacterState): CharacterData {
  return state.lang === "fr" ? state.fr : state.en;
}

function buildButtonRow(state: CharacterState): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:overview`)
      .setLabel("Vue d'ensemble")
      .setEmoji("📊")
      .setStyle(state.page === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "overview"),
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:skills`)
      .setLabel("Skills")
      .setEmoji("⚔️")
      .setStyle(state.page === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(state.page === "skills"),
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:lang`)
      .setLabel(state.lang === "fr" ? "EN" : "FR")
      .setEmoji(state.lang === "fr" ? "🇬🇧" : "🇫🇷")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel("Fiche complète")
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildWeaponSelectRow(state: CharacterState): ActionRowBuilder<StringSelectMenuBuilder> {
  const char = getChar(state);
  const weaponTypes = getWeaponTypes(char);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:weapon`)
    .setPlaceholder(state.lang === "fr" ? "Choisir une arme" : "Select a weapon")
    .addOptions(
      weaponTypes.map((wtKey) => {
        // Get translated name from weaponSlots or skills
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

  if (state.page === "skills") {
    rows.push(buildWeaponSelectRow(state));
  }

  return rows;
}

function buildExpiredComponents(state: CharacterState): ActionRowBuilder<ButtonBuilder> {
  const char = getChar(state);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("char:expired:overview")
      .setLabel("Vue d'ensemble")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("char:expired:skills")
      .setLabel("Skills")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("char:expired:lang")
      .setLabel(state.lang === "fr" ? "EN" : "FR")
      .setEmoji(state.lang === "fr" ? "🇬🇧" : "🇫🇷")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setLabel("Fiche complète")
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildCurrentEmbed(state: CharacterState): EmbedBuilder {
  const char = getChar(state);
  return state.page === "overview"
    ? buildOverviewEmbed(char)
    : buildSkillsEmbed(char, state.activeWeapon);
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

  try {
    const [charFr, charEn] = await Promise.all([
      apiClient.getCharacter(slug, "fr"),
      apiClient.getCharacter(slug, "en"),
    ]);

    const weaponTypes = getWeaponTypes(charFr);

    const state: CharacterState = {
      fr: charFr,
      en: charEn,
      lang: "fr",
      page: "overview",
      activeWeapon: weaponTypes[0] ?? "",
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
        await i.reply({ content: "Utilise `/character` pour ta propre recherche.", ephemeral: true });
        return;
      }

      if (i.isButton()) {
        const action = i.customId.split(":")[2];

        if (action === "overview") {
          state.page = "overview";
        } else if (action === "skills") {
          state.page = "skills";
        } else if (action === "lang") {
          state.lang = state.lang === "fr" ? "en" : "fr";
          const char = getChar(state);
          const wt = getWeaponTypes(char);
          if (!wt.includes(state.activeWeapon)) {
            state.activeWeapon = wt[0] ?? "";
          }
        }

        await i.update({
          embeds: [buildCurrentEmbed(state)],
          components: buildComponents(state),
        });
      }

      if (i.isStringSelectMenu()) {
        state.activeWeapon = i.values[0];
        await i.update({
          embeds: [buildCurrentEmbed(state)],
          components: buildComponents(state),
        });
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [buildExpiredComponents(state)] });
      } catch { /* message may have been deleted */ }
    });
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.editReply({ content: "❌ Personnage introuvable ou erreur API." });
  }
}
