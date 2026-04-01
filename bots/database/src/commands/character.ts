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

// ── Mappings ────────────────────────────────────────────────────────

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
  "Sword1h": "Épée 1H", "SwordDual": "Doubles épées", "Sword2h": "Épée 2H",
  "Bow": "Arc", "Staff": "Bâton", "Dagger": "Dague",
  "Spear": "Lance", "Axe": "Hache", "Mace": "Masse", "Shield": "Bouclier",
};

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

// ── Embed builder ───────────────────────────────────────────────────

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elemEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const role = ROLE_LABELS[char.role] ?? char.role;
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;
  const s = char.stats;

  const title = char.name !== char.nameEn
    ? `${char.name} / ${char.nameEn}`
    : char.name;

  // ── Description : header + stats + armes (tout dans le pool 4096) ──

  const weapons = char.weaponSlots
    .map((w) => WEAPON_LABELS[w.weapon] ?? w.weapon)
    .join(" · ");

  const secondary: string[] = [];
  if (s.critRate) secondary.push(`Crit **${s.critRate}%**`);
  if (s.critDamage) secondary.push(`Crit DMG **${s.critDamage}%**`);
  if (s.accuracy) secondary.push(`Préc. **${s.accuracy}%**`);
  if (s.block) secondary.push(`Bloc **${s.block}%**`);

  const descParts = [
    `${elemEmoji} **${char.element}** · **${role}** · **${char.rarity}**`,
    "",
    "```",
    `  PV  ${fmt(s.hp).padStart(8)}    ATK ${fmt(s.atk).padStart(8)}`,
    `  DEF ${fmt(s.def).padStart(8)}    SPD ${String(s.spd).padStart(8)}`,
    "```",
  ];

  if (secondary.length > 0) {
    descParts.push(secondary.join(" · "));
  }

  descParts.push("", `🗡️ **Armes :** ${weapons || "—"}`);

  const description = descParts.join("\n");

  // ── Build embed ──

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `${char.rarity} · ${char.element} · ${role}`,
      iconURL: char.imageUrl || undefined,
    })
    .setTitle(title)
    .setURL(char.url)
    .setDescription(description)
    .setThumbnail(char.imageUrl || null);

  // ── Passif d'aventure (1 field) ──

  if (char.adventureSkill.length > 0) {
    const adventureText = char.adventureSkill
      .map((a) => `**${a.name}**\n${clean(a.description).split("\n")[0]}`)
      .join("\n\n");

    embed.addFields({
      name: "🏕️ Passif d'aventure",
      value: adventureText.slice(0, 1024),
    });
  }

  // ── Compétences (1 field par skill, max 6) ──

  const skills = char.skills.slice(0, 6);

  if (skills.length > 0) {
    // Première skill avec le header "Compétences"
    const first = skills[0];
    embed.addFields({
      name: `⚔️ ${first.name}`,
      value: formatSkillValue(first),
    });

    // Les suivantes
    for (let i = 1; i < skills.length; i++) {
      embed.addFields({
        name: skills[i].name,
        value: formatSkillValue(skills[i]),
      });
    }
  }

  embed.setFooter({ text: "7DS Origin · 7dsorigin.app" });
  embed.setTimestamp();

  return embed;
}

function formatSkillValue(sk: CharacterData["skills"][0]): string {
  const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
  const cd = sk.cooldown ? ` · ${sk.cooldown}s` : "";
  const meta = `*${cat}${cd}*`;

  const desc = clean(sk.description)
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, 2) // max 2 lines
    .join("\n");

  return `${meta}\n${desc.slice(0, 200)}`;
}

// ── Command ─────────────────────────────────────────────────────────

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
