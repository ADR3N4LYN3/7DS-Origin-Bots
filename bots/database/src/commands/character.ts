import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import type { ApiClient } from "../api/client.js";
import type { CharacterData, CharacterSkill } from "../api/types.js";

// ── Mappings ────────────────────────────────────────────────────────

const ELEMENT_EMOJIS: Record<string, string> = {
  "Feu": "<:Fire:1488554913406652486>", "FIRE": "<:Fire:1488554913406652486>",
  "Glace": "<:Ice:1488555000790646884>", "ICE": "<:Ice:1488555000790646884>",
  "Lumière": "<:Light:1488554768585719931>", "LIGHT": "<:Light:1488554768585719931>",
  "Ténèbres": "<:Darkness:1488553687516319857>", "DARK": "<:Darkness:1488553687516319857>",
  "Vent": "<:Wind:1488554876588789780>", "WIND": "<:Wind:1488554876588789780>",
  "Terre": "<:Earth:1488554844599091294>", "EARTH": "<:Earth:1488554844599091294>",
  "Foudre": "<:Thunder:1488554973838184518>", "THUNDER": "<:Thunder:1488554973838184518>", "LIGHTNING": "<:Thunder:1488554973838184518>",
  "Sacré": "✨", "HOLY": "✨",
};

const ELEMENT_UNICODE: Record<string, string> = {
  "Feu": "🔥", "FIRE": "🔥",
  "Glace": "🧊", "ICE": "🧊",
  "Lumière": "☀️", "LIGHT": "☀️",
  "Ténèbres": "🌑", "DARK": "🌑",
  "Vent": "🌪️", "WIND": "🌪️",
  "Terre": "🌿", "EARTH": "🌿",
  "Foudre": "⚡", "THUNDER": "⚡", "LIGHTNING": "⚡",
  "Sacré": "✨", "HOLY": "✨",
};

const ELEMENT_LABELS_FR: Record<string, string> = {
  "FIRE": "Feu", "Fire": "Feu", "Feu": "Feu",
  "ICE": "Glace", "Ice": "Glace", "Glace": "Glace",
  "LIGHT": "Lumière", "Light": "Lumière", "Lumière": "Lumière",
  "DARK": "Ténèbres", "Dark": "Ténèbres", "Darkness": "Ténèbres", "Ténèbres": "Ténèbres",
  "WIND": "Vent", "Wind": "Vent", "Vent": "Vent",
  "EARTH": "Terre", "Earth": "Terre", "Terre": "Terre",
  "THUNDER": "Foudre", "Thunder": "Foudre", "LIGHTNING": "Foudre", "Foudre": "Foudre",
  "HOLY": "Sacré", "Holy": "Sacré", "Sacré": "Sacré",
};

const ELEMENT_LABELS_EN: Record<string, string> = {
  "FIRE": "Fire", "Fire": "Fire", "Feu": "Fire",
  "ICE": "Ice", "Ice": "Ice", "Glace": "Ice",
  "LIGHT": "Light", "Light": "Light", "Lumière": "Light",
  "DARK": "Darkness", "Dark": "Darkness", "Darkness": "Darkness", "Ténèbres": "Darkness",
  "WIND": "Wind", "Wind": "Wind", "Vent": "Wind",
  "EARTH": "Earth", "Earth": "Earth", "Terre": "Earth",
  "THUNDER": "Thunder", "Thunder": "Thunder", "LIGHTNING": "Thunder", "Foudre": "Thunder",
  "HOLY": "Holy", "Holy": "Holy", "Sacré": "Holy",
};

const ROLE_LABELS_FR: Record<string, string> = {
  "ATTACKER": "Attaquant", "Attacker": "Attaquant", "Attaquant": "Attaquant",
  "DEFENDER": "Défenseur", "Defender": "Défenseur", "Défenseur": "Défenseur",
  "SUPPORT": "Support", "HEALER": "Soigneur", "Healer": "Soigneur", "Soigneur": "Soigneur",
};

const ROLE_LABELS_EN: Record<string, string> = {
  "ATTACKER": "Attacker", "Attacker": "Attacker", "Attaquant": "Attacker",
  "DEFENDER": "Defender", "Defender": "Defender", "Défenseur": "Defender",
  "SUPPORT": "Support", "HEALER": "Healer", "Healer": "Healer", "Soigneur": "Healer",
};

function elementLabel(key: string, lang: Lang): string {
  return (lang === "fr" ? ELEMENT_LABELS_FR : ELEMENT_LABELS_EN)[key] ?? key;
}

function roleLabel(key: string, lang: Lang): string {
  return (lang === "fr" ? ROLE_LABELS_FR : ROLE_LABELS_EN)[key] ?? key;
}

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700, "SR": 0xc084fc, "R": 0x60a5fa,
};

const RARITY_EMOJIS: Record<string, string> = {
  "SSR": "<:SSR:1488553581329256479>",
  "SR": "<:SR:1488553611733762058>",
};

const WEAPON_EMOJIS: Record<string, string> = {
  "Sword1h": "<:ItemDivision_sword1h:1493240454827999273>",
  "SwordDual": "<:ItemDivision_sworddual:1493240457184935967>",
  "Sword2h": "<:ItemDivision_sword2h:1493240455888896192>",
  "Bow": "<:ItemDivision_rapier:1493240450533036053>",
  "Staff": "<:ItemDivision_staff:1493240453053546646>",
  "Dagger": "<:ItemDivision_rapier:1493240450533036053>",
  "Spear": "<:ItemDivision_lance:1493240449123483728>",
  "Axe": "<:ItemDivision_axe:1493240409412079647>",
  "Mace": "<:ItemDivision_cudgel3c:1493240445856120866>",
  "Shield": "<:ItemDivision_shield:1493240451866824724>",
  "Wand": "<:ItemDivision_wand:1493240458502078595>",
  "Book": "<:ItemDivision_book:1493240431985692754>",
  "Gauntlets": "<:ItemDivision_gauntlets:1493240447202754670>",
};

const WEAPON_NAMES_FR: Record<string, string> = {
  "Sword1h": "Épée 1 main", "SwordDual": "Doubles épées", "Sword2h": "Épée 2 mains",
  "Bow": "Arc", "Staff": "Bâton", "Dagger": "Dague",
  "Spear": "Lance", "Axe": "Hache", "Mace": "Masse", "Shield": "Bouclier",
  "Wand": "Baguette", "Book": "Livre", "Gauntlets": "Gantelets",
};

const WEAPON_NAMES_EN: Record<string, string> = {
  "Sword1h": "1H Sword", "SwordDual": "Dual Swords", "Sword2h": "2H Sword",
  "Bow": "Bow", "Staff": "Staff", "Dagger": "Dagger",
  "Spear": "Spear", "Axe": "Axe", "Mace": "Mace", "Shield": "Shield",
  "Wand": "Wand", "Book": "Book", "Gauntlets": "Gauntlets",
};

function weaponName(key: string, lang: Lang): string {
  return (lang === "fr" ? WEAPON_NAMES_FR : WEAPON_NAMES_EN)[key] ?? key;
}

const SKILL_CATEGORIES: Record<string, string> = {
  "NORMAL_SKILL": "Normale", "NORMAL": "Normale",
  "ULTIMATE": "Ultime", "PASSIVE": "Passif",
  "ACTIVE_THIRD": "Spéciale", "TAG_SKILL": "Tag",
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

function parseEmoji(emojiStr: string | undefined): { id: string; name: string } | undefined {
  if (!emojiStr) return undefined;
  const match = emojiStr.match(/<:(\w+):(\d+)>/);
  if (!match) return undefined;
  return { name: match[1], id: match[2] };
}

function weaponLabel(key: string, lang: Lang = "fr"): string {
  const emoji = WEAPON_EMOJIS[key] ?? "⚔️";
  const name = weaponName(key, lang);
  return `${emoji} ${name}`;
}

function groupSkillsByWeapon(skills: CharacterSkill[]): Map<string, CharacterSkill[]> {
  const map = new Map<string, CharacterSkill[]>();
  for (const sk of skills) {
    const key = sk.weaponType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(sk);
  }
  return map;
}

// ── Lang type ───────────────────────────────────────────────────────

type Lang = "fr" | "en";

// ── Shared header ───────────────────────────────────────────────────

function baseEmbed(char: CharacterData, lang: Lang): EmbedBuilder {
  const elemEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const rarityEmoji = RARITY_EMOJIS[char.rarity] ?? "";
  const role = roleLabel(char.role, lang);
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  const title = char.name !== char.nameEn
    ? `${char.name} [${char.nameEn}]`
    : char.name;

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${elemEmoji} ${elementLabel(char.element, lang)} · ${role} ${rarityEmoji}\n\n**${title}**`)
    .setThumbnail(char.imageUrl || null)
    .setFooter({ text: "7DS Origin · 7dsorigin.app" });
}

// ── Page 1 : Overview ──────────────────────────────────────────────

function buildOverviewEmbed(char: CharacterData, lang: Lang): EmbedBuilder {
  const embed = baseEmbed(char, lang);
  const s = char.stats;

  embed.addFields({
    name: "📊 Stats de base",
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

  const weaponLines = char.weaponSlots.map((w) => {
    const label = weaponLabel(w.weapon, lang);
    const elemEmoji = ELEMENT_EMOJIS[w.element] ?? "";
    const elemName = elementLabel(w.element, lang);
    const role = roleLabel(w.role, lang);
    return `${label} · ${elemEmoji} ${elemName} · ${role}`;
  });

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

  return embed;
}

// ── Page 2 : Skills ────────────────────────────────────────────────

function buildSkillsEmbed(char: CharacterData, weaponType: string, lang: Lang): EmbedBuilder {
  const embed = baseEmbed(char, lang);
  const grouped = groupSkillsByWeapon(char.skills);
  const skills = grouped.get(weaponType) ?? [];
  const wLabel = weaponLabel(weaponType, lang);

  if (skills.length > 0) {
    for (const sk of skills) {
      const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
      const cd = sk.cooldown ? ` · CD ${sk.cooldown}s` : "";

      const statsParts: string[] = [];
      if (sk.damagePercent) statsParts.push(`**${sk.damagePercent}**`);
      if (sk.hitCount > 0) statsParts.push(`**${sk.hitCount}** hit${sk.hitCount > 1 ? "s" : ""}`);
      const statsLine = statsParts.length > 0
        ? statsParts.join(" × ") + "\n"
        : "";

      const desc = sk.description
        ? `> ${clean(sk.description).split("\n")[0].slice(0, 200)}\n`
        : "";

      const buffs = sk.buffs?.length > 0
        ? sk.buffs.map((b) => `├ 🟢 ${b.nameFr}`).join("\n") + "\n"
        : "";

      embed.addFields({
        name: `${cat} — ${sk.name}${cd}`,
        value: `${statsLine}${desc}${buffs}` || "\u200B",
      });
    }
  } else {
    embed.addFields({ name: wLabel, value: "*Aucun skill pour cette arme*" });
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
  activeWeapon: string;
}

function getWeaponTypes(char: CharacterData): string[] {
  return [...new Set(char.skills.map((sk) => sk.weaponType))];
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
      weaponTypes.map((wt) => ({
        label: weaponName(wt, state.lang),
        value: wt,
        emoji: parseEmoji(WEAPON_EMOJIS[wt]),
        default: wt === state.activeWeapon,
      })),
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
        const elem = ELEMENT_UNICODE[c.element] ?? "";
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
    // Fetch both languages in parallel
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
          // Reset weapon to first of current lang data
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
