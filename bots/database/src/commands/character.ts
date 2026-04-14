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

// Unicode fallbacks for autocomplete (Discord doesn't render custom emojis there)
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

const ELEMENT_LABELS: Record<string, string> = {
  "FIRE": "Feu", "Fire": "Feu", "Feu": "Feu",
  "ICE": "Glace", "Ice": "Glace", "Glace": "Glace",
  "LIGHT": "Lumière", "Light": "Lumière", "Lumière": "Lumière",
  "DARK": "Ténèbres", "Dark": "Ténèbres", "Darkness": "Ténèbres", "Ténèbres": "Ténèbres",
  "WIND": "Vent", "Wind": "Vent", "Vent": "Vent",
  "EARTH": "Terre", "Earth": "Terre", "Terre": "Terre",
  "THUNDER": "Foudre", "Thunder": "Foudre", "LIGHTNING": "Foudre", "Foudre": "Foudre",
  "HOLY": "Sacré", "Holy": "Sacré", "Sacré": "Sacré",
};

const ROLE_LABELS: Record<string, string> = {
  "ATTACKER": "Attaquant", "Attacker": "Attaquant", "Attaquant": "Attaquant",
  "DEFENDER": "Défenseur", "Defender": "Défenseur", "Défenseur": "Défenseur",
  "SUPPORT": "Support", "Support": "Support",
  "HEALER": "Soigneur", "Healer": "Soigneur", "Soigneur": "Soigneur",
};

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

const WEAPON_NAMES: Record<string, string> = {
  "Sword1h": "Épée 1 main", "SwordDual": "Doubles épées", "Sword2h": "Épée 2 mains",
  "Bow": "Arc", "Staff": "Bâton", "Dagger": "Dague",
  "Spear": "Lance", "Axe": "Hache", "Mace": "Masse", "Shield": "Bouclier",
  "Wand": "Baguette", "Book": "Livre", "Gauntlets": "Gantelets",
};

function parseEmoji(emojiStr: string | undefined): { id: string; name: string } | undefined {
  if (!emojiStr) return undefined;
  const match = emojiStr.match(/<:(\w+):(\d+)>/);
  if (!match) return undefined;
  return { name: match[1], id: match[2] };
}

function weaponLabel(key: string): string {
  const emoji = WEAPON_EMOJIS[key] ?? "⚔️";
  const name = WEAPON_NAMES[key] ?? key;
  return `${emoji} ${name}`;
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

function groupSkillsByWeapon(skills: CharacterSkill[]): Map<string, CharacterSkill[]> {
  const map = new Map<string, CharacterSkill[]>();
  for (const sk of skills) {
    const key = sk.weaponType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(sk);
  }
  return map;
}

// ── Shared header ───────────────────────────────────────────────────

function baseEmbed(char: CharacterData): EmbedBuilder {
  const elemEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const rarityEmoji = RARITY_EMOJIS[char.rarity] ?? "";
  const role = ROLE_LABELS[char.role] ?? char.role;
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  const title = char.name !== char.nameEn
    ? `${char.name} [${char.nameEn}]`
    : char.name;

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${elemEmoji} ${char.element} · ${role} ${rarityEmoji}\n\n**${title}**`)
    .setThumbnail(char.imageUrl || null)
    .setFooter({ text: "7DS Origin · 7dsorigin.app" });
}

// ── Page 1 : Vue d'ensemble ─────────────────────────────────────────

function buildOverviewEmbed(char: CharacterData): EmbedBuilder {
  const embed = baseEmbed(char);
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
    const label = weaponLabel(w.weapon);
    const elemEmoji = ELEMENT_EMOJIS[w.element] ?? "";
    const elemName = ELEMENT_LABELS[w.element] ?? w.element;
    const role = ROLE_LABELS[w.role] ?? w.role;
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

// ── Page 2 : Skills (filtrés par arme) ──────────────────────────────

function buildSkillsEmbed(char: CharacterData, weaponType: string): EmbedBuilder {
  const embed = baseEmbed(char);
  const grouped = groupSkillsByWeapon(char.skills);
  const skills = grouped.get(weaponType) ?? [];
  const weaponName = weaponLabel(weaponType);

  if (skills.length > 0) {
    for (const sk of skills) {
      const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
      const cd = sk.cooldown ? ` · CD ${sk.cooldown}s` : "";

      // Stats line
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
    embed.addFields({ name: weaponName, value: "*Aucun skill pour cette arme*" });
  }

  return embed;
}

// ── Components ──────────────────────────────────────────────────────

type Page = "overview" | "skills";

function getWeaponTypes(char: CharacterData): string[] {
  return [...new Set(char.skills.map((sk) => sk.weaponType))];
}

function buildButtonRow(char: CharacterData, activePage: Page): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:overview`)
      .setLabel("Vue d'ensemble")
      .setEmoji("📊")
      .setStyle(activePage === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activePage === "overview"),
    new ButtonBuilder()
      .setCustomId(`char:${char.slug}:skills`)
      .setLabel("Skills")
      .setEmoji("⚔️")
      .setStyle(activePage === "skills" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activePage === "skills"),
    new ButtonBuilder()
      .setLabel("Fiche complète")
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
}

function buildWeaponSelectRow(char: CharacterData, activeWeapon: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const weaponTypes = getWeaponTypes(char);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`char:${char.slug}:weapon`)
    .setPlaceholder("Choisir une arme")
    .addOptions(
      weaponTypes.map((wt) => ({
        label: WEAPON_NAMES[wt] ?? wt,
        value: wt,
        emoji: parseEmoji(WEAPON_EMOJIS[wt]),
        default: wt === activeWeapon,
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildComponents(
  char: CharacterData,
  page: Page,
  activeWeapon: string,
): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
  const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [
    buildButtonRow(char, page),
  ];

  if (page === "skills") {
    rows.push(buildWeaponSelectRow(char, activeWeapon));
  }

  return rows;
}

function buildExpiredComponents(char: CharacterData): ActionRowBuilder<ButtonBuilder> {
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
      .setLabel("Fiche complète")
      .setURL(char.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );
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

const COLLECTOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
  apiClient: ApiClient,
) {
  const slug = interaction.options.getString("name", true);
  await interaction.deferReply();

  try {
    const char = await apiClient.getCharacter(slug);
    const weaponTypes = getWeaponTypes(char);
    let activeWeapon = weaponTypes[0] ?? "";

    const reply = await interaction.editReply({
      embeds: [buildOverviewEmbed(char)],
      components: buildComponents(char, "overview", activeWeapon),
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
        const page = i.customId.split(":")[2] as Page;

        if (page === "overview") {
          await i.update({
            embeds: [buildOverviewEmbed(char)],
            components: buildComponents(char, "overview", activeWeapon),
          });
        } else {
          await i.update({
            embeds: [buildSkillsEmbed(char, activeWeapon)],
            components: buildComponents(char, "skills", activeWeapon),
          });
        }
      }

      if (i.isStringSelectMenu()) {
        activeWeapon = i.values[0];
        await i.update({
          embeds: [buildSkillsEmbed(char, activeWeapon)],
          components: buildComponents(char, "skills", activeWeapon),
        });
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [buildExpiredComponents(char)] });
      } catch { /* message may have been deleted */ }
    });
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.editReply({ content: "❌ Personnage introuvable ou erreur API." });
  }
}
