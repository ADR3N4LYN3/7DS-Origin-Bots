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
  "SUPPORT": "Support", "HEALER": "Soigneur",
};

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700, "SR": 0xc084fc, "R": 0x60a5fa,
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

function clean(text: string): string {
  return text.replace(/\[#[0-9A-Fa-f]{6}]/g, "").replace(/\[-]/g, "");
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

// ── Tree helpers ────────────────────────────────────────────────────

function tree(items: string[]): string {
  return items.map((item, i) => {
    const prefix = i < items.length - 1 ? "├" : "└";
    return `${prefix} ${item}`;
  }).join("\n");
}

// ── Embed builder ───────────────────────────────────────────────────

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elemEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";
  const role = ROLE_LABELS[char.role] ?? char.role;
  const color = RARITY_COLORS[char.rarity] ?? 0xc9a84c;
  const s = char.stats;

  const title = char.name !== char.nameEn
    ? `${char.name} [${char.nameEn}]`
    : char.name;

  // ── Description ──
  const desc = [
    `${elemEmoji} ${char.element} & ${role}`,
    "",
    `**${title}**`,
  ];

  if (char.description) {
    const cleaned = clean(char.description).split("\n")[0].slice(0, 120);
    desc.push("", `*${cleaned}${char.description.length > 120 ? "..." : ""}*`);
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(desc.join("\n"))
    .setThumbnail(char.imageUrl || null);

  // ── Stats : 2 inline fields ──
  embed.addFields(
    {
      name: "📊 Stats :",
      value: tree([
        `❤️ PV *${fmt(s.hp)}*`,
        `⚔️ ATK *${fmt(s.atk)}*`,
        `🛡️ DEF *${fmt(s.def)}*`,
        `💨 SPD *${s.spd}*`,
      ]),
      inline: true,
    },
    {
      name: "📈 Secondaires :",
      value: tree([
        `Crit *${s.critRate}%*`,
        `Crit DMG *${s.critDamage}%*`,
        `Précision *${s.accuracy}%*`,
        `Bloc *${s.block}%*`,
      ]),
      inline: true,
    },
  );

  // ── Armes ──
  const weapons = char.weaponSlots
    .map((w) => `⚔️ *${WEAPON_LABELS[w.weapon] ?? w.weapon}*`);

  embed.addFields({
    name: "🗡️ Armes :",
    value: tree(weapons.length > 0 ? weapons : ["—"]),
    inline: true,
  });

  // ── Skills : 2 inline fields (nom | type) ──
  const skills = char.skills.slice(0, 8);

  if (skills.length > 0) {
    const skillNames = skills.map((sk) => `**${sk.name}**`);
    const skillTypes = skills.map((sk) => {
      const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
      const cd = sk.cooldown ? ` · ${sk.cooldown}s` : "";
      return `*${cat}${cd}*`;
    });

    embed.addFields(
      {
        name: "⚔️ Compétences :",
        value: tree(skillNames),
        inline: true,
      },
      {
        name: "Type :",
        value: tree(skillTypes),
        inline: true,
      },
    );
  }

  // ── Passif d'aventure ──
  if (char.adventureSkill.length > 0) {
    const advLines = char.adventureSkill.map((a) => {
      const d = clean(a.description).split("\n")[0].slice(0, 80);
      return `**${a.name}**\n*${d}*`;
    });

    embed.addFields({
      name: "🏕️ Passif d'aventure :",
      value: tree(advLines),
    });
  }

  embed.setFooter({ text: "7DS Origin · 7dsorigin.app" });

  return embed;
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
