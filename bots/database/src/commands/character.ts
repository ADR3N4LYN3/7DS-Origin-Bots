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
  "Foudre": "⚡", "LIGHTNING": "⚡",
};

const ROLE_EMOJIS: Record<string, string> = {
  "Attaquant": "⚔️", "ATTACKER": "⚔️",
  "Défenseur": "🛡️", "DEFENDER": "🛡️",
  "Support": "💚", "SUPPORT": "💚",
  "Soigneur": "💖", "HEALER": "💖",
};

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700,
  "SR": 0xc084fc,
  "R": 0x60a5fa,
};

const WEAPON_NAMES: Record<string, string> = {
  "Sword1h": "Épée 1H",
  "SwordDual": "Doubles épées",
  "Sword2h": "Épée 2H",
  "Bow": "Arc",
  "Staff": "Bâton",
  "Dagger": "Dague",
  "Spear": "Lance",
  "Axe": "Hache",
  "Mace": "Masse",
  "Shield": "Bouclier",
};

const SKILL_CATEGORIES: Record<string, string> = {
  "NORMAL_SKILL": "Normal",
  "ULTIMATE": "Ultime",
  "PASSIVE": "Passif",
};

// Clean color tags like [#1A7331]text[-] → text
function cleanColorTags(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

// Truncate to fit Discord's 1024 char field limit
function truncateField(text: string, max = 1024): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elementEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const roleEmoji = ROLE_EMOJIS[char.role] ?? "👤";
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  // Stats principales
  const statsLines = [
    `❤️ HP **${char.stats.hp.toLocaleString()}**  ⚔️ ATK **${char.stats.atk.toLocaleString()}**`,
    `🛡️ DEF **${char.stats.def.toLocaleString()}**  💨 SPD **${char.stats.spd}**`,
  ];

  // Stats secondaires (seulement si non-zéro)
  const secondaryStats: string[] = [];
  if (char.stats.critRate) secondaryStats.push(`Crit ${char.stats.critRate}%`);
  if (char.stats.critDamage) secondaryStats.push(`Crit DMG ${char.stats.critDamage}%`);
  if (char.stats.accuracy) secondaryStats.push(`Précision ${char.stats.accuracy}%`);
  if (char.stats.block) secondaryStats.push(`Bloc ${char.stats.block}%`);
  if (secondaryStats.length > 0) {
    statsLines.push(secondaryStats.join("  •  "));
  }

  // Armes
  const weaponList = char.weaponSlots
    .map((w) => WEAPON_NAMES[w.weapon] ?? w.weapon)
    .join(", ");

  // Skills (max 5 pour pas dépasser la limite embed)
  const skillsBlock = char.skills
    .slice(0, 5)
    .map((s) => {
      const cat = SKILL_CATEGORIES[s.category] ?? s.category;
      const cd = s.cooldown ? `  •  CD: ${s.cooldown}s` : "";
      const dmg = s.damagePercent ? `  •  ${s.damagePercent}` : "";
      const desc = cleanColorTags(s.description).split("\n")[0]; // first line only
      return `> **${s.name}** *(${cat}${cd}${dmg})*\n> ${desc}`;
    })
    .join("\n\n");

  // Adventure skills
  const adventureBlock = char.adventureSkill.length > 0
    ? char.adventureSkill.map((s) => `> **${s.name}** — ${cleanColorTags(s.description).split("\n")[0]}`).join("\n")
    : null;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${char.name} / ${char.nameEn}`)
    .setURL(char.url)
    .setDescription(
      `${elementEmoji} ${char.element}  •  ${roleEmoji} ${char.role}  •  ⭐ ${char.rarity}\n\n` +
      (char.description ? `*${cleanColorTags(char.description).slice(0, 200)}${char.description.length > 200 ? "..." : ""}*` : ""),
    )
    .addFields(
      { name: "📊 Stats", value: statsLines.join("\n") },
      { name: "🗡️ Armes", value: weaponList || "—", inline: true },
    );

  if (adventureBlock) {
    embed.addFields({ name: "🏕️ Passif d'aventure", value: truncateField(adventureBlock) });
  }

  if (skillsBlock) {
    embed.addFields({ name: "⚔️ Compétences", value: truncateField(skillsBlock) });
  }

  if (char.imageUrl) embed.setThumbnail(char.imageUrl);
  embed.setFooter({ text: "7DS Origin" });
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
      results.slice(0, 25).map((c) => ({
        name: `${c.name} / ${c.nameEn}  [${c.rarity}]`,
        value: c.slug,
      })),
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
