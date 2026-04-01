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
import type { CharacterData, CharacterSkill } from "../api/types.js";

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
  "Sword1h": "🗡️ Épée 1H", "SwordDual": "⚔️ Doubles épées", "Sword2h": "🔱 Épée 2H",
  "Bow": "🏹 Arc", "Staff": "🪄 Bâton", "Dagger": "🔪 Dague",
  "Spear": "🔱 Lance", "Axe": "🪓 Hache", "Mace": "🔨 Masse", "Shield": "🛡️ Bouclier",
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

function pct(n: number): string {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

function tree(items: string[]): string {
  return items.map((item, i) =>
    `${i < items.length - 1 ? "├" : "└"} ${item}`,
  ).join("\n");
}

// ── Group skills by weapon ──────────────────────────────────────────

function groupSkillsByWeapon(skills: CharacterSkill[]): Map<string, CharacterSkill[]> {
  const map = new Map<string, CharacterSkill[]>();
  for (const sk of skills) {
    const key = sk.weaponType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(sk);
  }
  return map;
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
  const desc = [`${elemEmoji} ${char.element} & ${role}`, "", `**${title}**`];

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(desc.join("\n"))
    .setThumbnail(char.imageUrl || null);

  // ── Stats : 2 inline fields ──
  const statItems = [
    `❤️ PV *${fmt(s.hp)}*`,
    `⚔️ ATK *${fmt(s.atk)}*`,
    `🛡️ DEF *${fmt(s.def)}*`,
    `🏃 Vitesse *${fmt(s.spd)}*`,
  ];

  const secItems: string[] = [];
  if (s.critRate) secItems.push(`Crit *${pct(s.critRate)}*`);
  if (s.critDamage) secItems.push(`Crit DMG *${pct(s.critDamage)}*`);
  if (s.accuracy) secItems.push(`Préc. *${pct(s.accuracy)}*`);
  if (s.block) secItems.push(`Bloc *${pct(s.block)}*`);

  embed.addFields(
    { name: "📊 Stats (base) :", value: tree(statItems), inline: true },
  );

  if (secItems.length > 0) {
    embed.addFields(
      { name: "📈 Secondaires :", value: tree(secItems), inline: true },
    );
  }

  // ── Armes ──
  const weapons = char.weaponSlots
    .map((w) => WEAPON_LABELS[w.weapon] ?? w.weapon);

  embed.addFields({
    name: "🗡️ Armes :",
    value: tree(weapons.length > 0 ? weapons : ["—"]),
  });

  // ── Skills groupées par arme (1 field par arme) ──
  const grouped = groupSkillsByWeapon(char.skills);

  for (const [weaponType, skills] of grouped) {
    const weaponName = WEAPON_LABELS[weaponType] ?? weaponType;
    const lines = skills.map((sk) => {
      const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
      const cd = sk.cooldown ? ` · ${sk.cooldown}s` : "";
      return `**${sk.name}** — *${cat}${cd}*`;
    });

    embed.addFields({
      name: weaponName,
      value: tree(lines).slice(0, 1024),
    });
  }

  // ── Passif d'aventure ──
  if (char.adventureSkill.length > 0) {
    const advLines = char.adventureSkill.map((a) => {
      const d = clean(a.description).split("\n")[0].slice(0, 100);
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
