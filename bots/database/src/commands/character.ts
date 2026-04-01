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
  "ATTACKER": "Attaquant", "Attaquant": "Attaquant",
  "DEFENDER": "Défenseur", "Défenseur": "Défenseur",
  "SUPPORT": "Support",
  "HEALER": "Soigneur",
};

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700,
  "SR": 0xc084fc,
  "R": 0x60a5fa,
};

const WEAPON_LABELS: Record<string, string> = {
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
  "NORMAL_SKILL": "Normale",
  "NORMAL": "Normale",
  "ULTIMATE": "Ultime",
  "PASSIVE": "Passif",
  "ACTIVE_THIRD": "Spéciale",
  "TAG_SKILL": "Tag",
};

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function truncate(text: string, max = 1024): string {
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max - 4);
  const last = trimmed.lastIndexOf("\n");
  return (last > 0 ? trimmed.slice(0, last) : trimmed) + "\n...";
}

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elemEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const role = ROLE_LABELS[char.role] ?? char.role;
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;

  const title = char.name !== char.nameEn
    ? `${char.name} / ${char.nameEn}`
    : char.name;

  // ── Subtitle ──
  const subtitle = `${elemEmoji} ${char.element} **•** ${role}`;

  // ── Weapons inline ──
  const weapons = char.weaponSlots
    .map((w) => WEAPON_LABELS[w.weapon] ?? w.weapon)
    .join(" **·** ");

  // ── Stats — two inline fields ──
  const s = char.stats;
  const statsLeft = [
    `❤️ PV: **${s.hp.toLocaleString("fr-FR")}**`,
    `⚔️ ATK: **${s.atk.toLocaleString("fr-FR")}**`,
  ].join("\n");

  const statsRight = [
    `🛡️ DEF: **${s.def.toLocaleString("fr-FR")}**`,
    `💨 SPD: **${s.spd}**`,
  ].join("\n");

  // ── Secondary stats ──
  const sec: string[] = [];
  if (s.critRate) sec.push(`Crit **${s.critRate}%**`);
  if (s.critDamage) sec.push(`Crit DMG **${s.critDamage}%**`);
  if (s.accuracy) sec.push(`Préc. **${s.accuracy}%**`);
  if (s.block) sec.push(`Bloc **${s.block}%**`);

  // ── Skills — compact, one per line ──
  const skillLines = char.skills.slice(0, 6).map((sk) => {
    const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
    const cd = sk.cooldown ? ` · ${sk.cooldown}s` : "";
    const desc = clean(sk.description).split("\n")[0].slice(0, 60);
    return `╸ **${sk.name}** *${cat}${cd}*\n╸ ${desc}${sk.description.length > 60 ? "..." : ""}`;
  });

  // ── Adventure skill ──
  const adventure = char.adventureSkill.length > 0
    ? char.adventureSkill.map((a) =>
        `╸ **${a.name}** — ${clean(a.description).split("\n")[0].slice(0, 100)}`,
      ).join("\n")
    : null;

  // ── Build ──
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `${char.rarity} · ${char.element} · ${role}`,
      iconURL: char.imageUrl || undefined,
    })
    .setTitle(title)
    .setURL(char.url)
    .setDescription(subtitle)
    .setThumbnail(char.imageUrl || null)
    .addFields(
      { name: "\u200B", value: `**__Stats__**`, inline: false },
      { name: "\u200B", value: statsLeft, inline: true },
      { name: "\u200B", value: statsRight, inline: true },
    );

  if (sec.length > 0) {
    embed.addFields({ name: "\u200B", value: sec.join(" · "), inline: false });
  }

  embed.addFields(
    { name: "🗡️ Armes", value: weapons || "—", inline: false },
  );

  if (adventure) {
    embed.addFields({ name: "🏕️ Passif d'aventure", value: truncate(adventure) });
  }

  if (skillLines.length > 0) {
    embed.addFields({ name: "⚔️ Compétences", value: truncate(skillLines.join("\n\n")) });
  }

  embed.setFooter({ text: "7DS Origin · 7dsorigin.app" });
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
        const elem = ELEMENT_EMOJIS[c.element] ?? "";
        const label = c.name !== c.nameEn ? `${c.name} / ${c.nameEn}` : c.name;
        return { name: `${elem} ${label}  [${c.rarity}]`, value: c.slug };
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
        .setLabel("Fiche complète")
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
