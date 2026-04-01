import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import type { ApiClient } from "../api/client.js";

// Placeholder data for autocomplete until API is ready
const PLACEHOLDER_CHARACTERS = [
  { id: "meliodas", name: "Meliodas", nameEn: "Meliodas" },
  { id: "elizabeth", name: "Elizabeth", nameEn: "Elizabeth" },
  { id: "ban", name: "Ban", nameEn: "Ban" },
  { id: "king", name: "King", nameEn: "King" },
  { id: "diane", name: "Diane", nameEn: "Diane" },
  { id: "gowther", name: "Gowther", nameEn: "Gowther" },
  { id: "merlin", name: "Merlin", nameEn: "Merlin" },
  { id: "escanor", name: "Escanor", nameEn: "Escanor" },
  { id: "zeldris", name: "Zeldris", nameEn: "Zeldris" },
  { id: "estarossa", name: "Estarossa", nameEn: "Estarossa" },
];

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

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle(`${character.name} / ${character.nameEn}`)
    .setDescription(
      "🚧 **API en cours de développement**\n\n" +
      "Les données détaillées (stats, compétences, équipement) seront disponibles " +
      "dès que l'API [7dsorigin.app](https://7dsorigin.app) sera prête.",
    )
    .setFooter({ text: "7DS Origin" });

  await interaction.reply({ embeds: [embed] });
}
