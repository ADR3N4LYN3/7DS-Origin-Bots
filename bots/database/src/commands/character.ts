import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const ROLE_LABELS: Record<string, string> = {
  "ATTACKER": "Attaquant", "Attaquant": "Attaquant",
  "DEFENDER": "Défenseur", "Défenseur": "Défenseur",
  "SUPPORT": "Support", "HEALER": "Soigneur",
};

const RARITY_COLORS: Record<string, number> = {
  "SSR": 0xffd700, "SR": 0xc084fc, "R": 0x60a5fa,
};

const RARITY_EMOJIS: Record<string, string> = {
  "SSR": "<:SSR:1488553581329256479>",
  "SR": "<:SR:1488553611733762058>",
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

  // Stats de base — 2 colonnes inline
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

  // Armes compatibles
  const weaponLines = char.weaponSlots.map((w) => {
    const label = WEAPON_LABELS[w.weapon] ?? w.weapon;
    const elem = ELEMENT_EMOJIS[w.element] ?? "";
    const role = ROLE_LABELS[w.role] ?? w.role;
    return `${label} · ${elem} ${w.element} · ${role}`;
  });

  embed.addFields({
    name: "🗡️ Armes compatibles",
    value: tree(weaponLines.length > 0 ? weaponLines : ["—"]),
  });

  // Description du personnage (si dispo)
  if (char.description) {
    const desc = clean(char.description).slice(0, 200);
    embed.addFields({
      name: "📖 Description",
      value: `> *${desc}${char.description.length > 200 ? "…" : ""}*`,
    });
  }

  return embed;
}

// ── Page 2 : Skills ─────────────────────────────────────────────────

function buildSkillsEmbed(char: CharacterData): EmbedBuilder {
  const embed = baseEmbed(char);

  const grouped = groupSkillsByWeapon(char.skills);

  for (const [weaponType, skills] of grouped) {
    const weaponName = WEAPON_LABELS[weaponType] ?? weaponType;

    const lines = skills.map((sk) => {
      const cat = SKILL_CATEGORIES[sk.category] ?? sk.category;
      const cd = sk.cooldown ? ` · CD ${sk.cooldown}s` : "";
      const dmg = sk.damagePercent ? ` · ${sk.damagePercent}` : "";
      const hits = sk.hitCount > 0 ? ` × ${sk.hitCount}` : "";
      const buffs = sk.buffs.length > 0
        ? "\n" + sk.buffs.map((b) => `  🔸 ${b.nameFr}`).join("\n")
        : "";

      return `**${sk.name}** — *${cat}${cd}*${dmg}${hits}${buffs}`;
    });

    embed.addFields({
      name: weaponName,
      value: tree(lines).slice(0, 1024),
    });
  }

  // Passif d'aventure
  if (char.adventureSkill.length > 0) {
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

// ── Buttons ─────────────────────────────────────────────────────────

type Page = "overview" | "skills";

function buildButtons(char: CharacterData, activePage: Page): ActionRowBuilder<ButtonBuilder> {
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

function getEmbed(char: CharacterData, page: Page): EmbedBuilder {
  return page === "overview" ? buildOverviewEmbed(char) : buildSkillsEmbed(char);
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

    const reply = await interaction.editReply({
      embeds: [buildOverviewEmbed(char)],
      components: [buildButtons(char, "overview")],
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (btn: ButtonInteraction) => {
      // Only the command author can navigate
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: "Utilise `/character` pour ta propre recherche.", ephemeral: true });
        return;
      }

      const page = btn.customId.split(":")[2] as Page;

      await btn.update({
        embeds: [getEmbed(char, page)],
        components: [buildButtons(char, page)],
      });
    });

    collector.on("end", async () => {
      // Disable buttons after timeout
      try {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
        await interaction.editReply({ components: [disabledRow] });
      } catch { /* message may have been deleted */ }
    });
  } catch (err) {
    console.error("Character fetch error:", err);
    await interaction.editReply({ content: "❌ Personnage introuvable ou erreur API." });
  }
}
