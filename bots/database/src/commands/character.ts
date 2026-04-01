import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import type { ApiClient } from "../api/client.js";
import type { CharacterData } from "../api/types.js";

// Placeholder data until API is ready
const PLACEHOLDER_CHARACTERS: CharacterData[] = [
  {
    id: "meliodas",
    name: "Meliodas",
    nameEn: "Meliodas",
    rarity: "SSR",
    element: "Feu",
    imageUrl: "https://7dsorigin.app/images/characters/meliodas.png",
    stats: { hp: 12450, attack: 3520, defense: 2180, speed: 185 },
    skills: [
      { name: "Full Counter", description: "Renvoie 2x les dégâts reçus à l'ennemi" },
      { name: "Lame Démoniaque", description: "Inflige 350% de dégâts à un ennemi" },
    ],
    url: "https://7dsorigin.app/characters/meliodas",
  },
  {
    id: "escanor",
    name: "Escanor",
    nameEn: "Escanor",
    rarity: "SSR",
    element: "Lumière",
    imageUrl: "https://7dsorigin.app/images/characters/escanor.png",
    stats: { hp: 11800, attack: 4100, defense: 1950, speed: 160 },
    skills: [
      { name: "Sunshine", description: "Augmente l'ATK de 50% pendant 3 tours" },
      { name: "Cruel Sun", description: "Inflige 400% de dégâts de zone" },
    ],
    url: "https://7dsorigin.app/characters/escanor",
  },
  {
    id: "ban",
    name: "Ban",
    nameEn: "Ban",
    rarity: "SSR",
    element: "Glace",
    imageUrl: "https://7dsorigin.app/images/characters/ban.png",
    stats: { hp: 13200, attack: 3100, defense: 2400, speed: 170 },
    skills: [
      { name: "Snatch", description: "Vole 30% des stats de l'ennemi" },
      { name: "Hunter Fest", description: "Draine la vie de tous les ennemis" },
    ],
    url: "https://7dsorigin.app/characters/ban",
  },
];

const ELEMENT_EMOJIS: Record<string, string> = {
  "Feu": "🔥",
  "Glace": "❄️",
  "Lumière": "☀️",
  "Ténèbres": "🌑",
  "Vent": "🌪️",
  "Terre": "🌿",
  "Foudre": "⚡",
};

function buildCharacterEmbed(char: CharacterData): EmbedBuilder {
  const elementEmoji = ELEMENT_EMOJIS[char.element] ?? "🔮";

  const statsBlock = [
    `❤️ HP: **${char.stats.hp.toLocaleString()}**`,
    `⚔️ ATK: **${char.stats.attack.toLocaleString()}**`,
    `🛡️ DEF: **${char.stats.defense.toLocaleString()}**`,
    `💨 SPD: **${char.stats.speed}**`,
  ].join("   ");

  const skillsBlock = char.skills
    .map((s) => `> **${s.name}**\n> ${s.description}`)
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle(`${char.name} / ${char.nameEn}`)
    .setDescription(`${elementEmoji} ${char.element}  •  ⭐ ${char.rarity}`)
    .addFields(
      { name: "📊 Stats", value: statsBlock },
      { name: "⚔️ Compétences", value: skillsBlock },
    )
    .setFooter({ text: "7DS Origin" })
    .setTimestamp();

  if (char.imageUrl) embed.setThumbnail(char.imageUrl);
  if (char.url) embed.setURL(char.url);

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
  _apiClient: ApiClient,
) {
  const focused = interaction.options.getFocused().toLowerCase();

  // TODO: Replace with apiClient.searchCharacters() when API is ready
  const filtered = PLACEHOLDER_CHARACTERS
    .filter((c) =>
      c.name.toLowerCase().includes(focused) ||
      c.nameEn.toLowerCase().includes(focused),
    )
    .slice(0, 25);

  await interaction.respond(
    filtered.map((c) => ({
      name: `${c.name} / ${c.nameEn}`,
      value: c.id,
    })),
  );
}

export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
  _apiClient: ApiClient,
) {
  const characterId = interaction.options.getString("name", true);

  // TODO: Replace with apiClient.getCharacter(characterId) when API is ready
  const character = PLACEHOLDER_CHARACTERS.find((c) => c.id === characterId);

  if (!character) {
    await interaction.reply({ content: "❌ Personnage introuvable.", flags: 64 });
    return;
  }

  const embed = buildCharacterEmbed(character);
  await interaction.reply({ embeds: [embed] });
}
