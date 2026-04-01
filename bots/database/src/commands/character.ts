import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { ApiClient } from "../api/client.js";
import type { CharacterData } from "../api/types.js";

const ELEMENT_EMOJIS: Record<string, string> = {
  "Feu": "🔥", "FIRE": "🔥",
  "Glace": "❄️", "ICE": "❄️",
  "Lumière": "☀️", "LIGHT": "☀️",
  "Ténèbres": "🌑", "DARK": "🌑",
  "Vent": "🌪️", "WIND": "🌪️",
  "Terre": "🌿", "EARTH": "🌿",
  "Foudre": "⚡", "THUNDER": "⚡", "LIGHTNING": "⚡",
  "Sacré": "✨", "HOLY": "✨",
};

const ROLE_LABELS: Record<string, string> = {
  "ATTACKER": "Attaquant",
  "DEFENDER": "Défenseur",
  "SUPPORT": "Support",
  "HEALER": "Soigneur",
};

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700,
  "SR": 0xc084fc,
  "R": 0x60a5fa,
};

const WEAPON_EMOJIS: Record<string, string> = {
  "Sword1h": "🗡️ Épée 1H",
  "SwordDual": "⚔️ Doubles épées",
  "Sword2h": "🔱 Épée 2H",
  "Bow": "🏹 Arc",
  "Staff": "🪄 Bâton",
  "Dagger": "🔪 Dague",
  "Spear": "🔱 Lance",
  "Axe": "🪓 Hache",
  "Mace": "🔨 Masse",
  "Shield": "🛡️ Bouclier",
};

const SKILL_CATEGORIES: Record<string, string> = {
  "NORMAL_SKILL": "Normale",
  "NORMAL": "Normale",
  "ULTIMATE": "Ultime",
  "PASSIVE": "Passif",
  "ACTIVE_THIRD": "Spéciale",
  "TAG_SKILL": "Tag",
};

function cleanColorTags(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function truncateField(text: string, max = 1024): string {
  if (text.length <= max) return text;
  // Truncate at last complete line within limit
  const trimmed = text.slice(0, max - 4);
  const lastNewline = trimmed.lastIndexOf("\n");
  return (lastNewline > 0 ? trimmed.slice(0, lastNewline) : trimmed) + "\n...";
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elementEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const role = ROLE_LABELS[char.role] ?? char.role;
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  // ── Header description ──
  const descLines = [
    `${elementEmoji} **${char.element}**  •  **${role}**  •  **${char.rarity}**`,
  ];

  if (char.description) {
    const clean = cleanColorTags(char.description).split("\n")[0];
    descLines.push("", `*${clean.slice(0, 150)}${clean.length > 150 ? "..." : ""}*`);
  }

  // ── Stats block ──
  const stats = char.stats;
  const statsBlock = [
    "```",
    `HP  ${formatNumber(stats.hp).padStart(7)}   ATK ${formatNumber(stats.atk).padStart(7)}`,
    `DEF ${formatNumber(stats.def).padStart(7)}   SPD ${String(stats.spd).padStart(7)}`,
    "```",
  ].join("\n");

  // Secondary stats (only non-zero, compact)
  const secondary: string[] = [];
  if (stats.critRate) secondary.push(`Crit **${stats.critRate}%**`);
  if (stats.critDamage) secondary.push(`Crit DMG **${stats.critDamage}%**`);
  if (stats.accuracy) secondary.push(`Préc. **${stats.accuracy}%**`);
  if (stats.block) secondary.push(`Bloc **${stats.block}%**`);
  const secondaryLine = secondary.length > 0 ? secondary.join("  •  ") : "";

  // ── Weapons ──
  const weapons = char.weaponSlots
    .map((w) => WEAPON_EMOJIS[w.weapon] ?? w.weapon)
    .join("\n");

  // ── Skills — compact format ──
  const skillLines = char.skills.slice(0, 6).map((s) => {
    const cat = SKILL_CATEGORIES[s.category] ?? s.category;
    const cd = s.cooldown ? ` ${s.cooldown}s` : "";
    const desc = cleanColorTags(s.description).split("\n")[0].slice(0, 80);
    return `**${s.name}** — *${cat}${cd}*\n${desc}${s.description.length > 80 ? "..." : ""}`;
  });

  // ── Adventure skills ──
  const adventureLines = char.adventureSkill.map((s) => {
    const desc = cleanColorTags(s.description).split("\n")[0];
    return `**${s.name}** — ${desc}`;
  });

  // ── Build embed ──
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${char.rarity}  •  ${role}`, iconURL: char.imageUrl || undefined })
    .setTitle(char.name !== char.nameEn ? `${char.name} / ${char.nameEn}` : char.name)
    .setURL(char.url)
    .setDescription(descLines.join("\n"))
    .addFields(
      { name: "━━━ Stats ━━━", value: statsBlock + secondaryLine },
    );

  if (weapons) {
    embed.addFields({ name: "━━━ Armes ━━━", value: weapons });
  }

  if (adventureLines.length > 0) {
    embed.addFields({
      name: "━━━ Passif d'aventure ━━━",
      value: truncateField(adventureLines.join("\n")),
    });
  }

  if (skillLines.length > 0) {
    embed.addFields({
      name: "━━━ Compétences ━━━",
      value: truncateField(skillLines.join("\n\n")),
    });
  }

  if (char.imageUrl) embed.setThumbnail(char.imageUrl);
  embed.setFooter({ text: "7DS Origin • 7dsorigin.app" });
  embed.setTimestamp();

  return embed;
}

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

export async function handleCharacterAutocomplete(
  interaction: AutocompleteInteraction,
  apiClient: ApiClient,
) {
  const focused = interaction.options.getFocused();

  try {
    const results = await apiClient.searchCharacters(focused);
    await interaction.respond(
      results.slice(0, 25).map((c) => {
        const element = ELEMENT_EMOJIS[c.element] ?? "";
        const label = c.name !== c.nameEn ? `${c.name} / ${c.nameEn}` : c.name;
        return {
          name: `${element} ${label}  [${c.rarity}]`,
          value: c.slug,
        };
      }),
    );
  } catch (err) {
    console.error("Autocomplete error:", err);
    await interaction.respond([]);
  }
}

export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
  apiClient: ApiClient,
) {
  const slug = interaction.options.getString("name", true);

  await interaction.deferReply();

  try {
    const character = await apiClient.getCharacter(slug);
    const embed = buildCharacterEmbed(character);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Voir sur 7dsorigin.app")
        .setURL(character.url)
        .setStyle(ButtonStyle.Link)
        .setEmoji("🔗"),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.editReply({ content: "❌ Personnage introuvable ou erreur API." });
  }
}
