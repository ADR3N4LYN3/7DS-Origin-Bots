import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

export function buildClearCommand() {
  return new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer des messages dans le channel (admin)")
    .addIntegerOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    );
}

export async function handleClearCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  const roles = interaction.member?.roles;
  const hasAdmin =
    roles instanceof GuildMemberRoleManager
      ? roles.cache.has(adminRoleId)
      : Array.isArray(roles) && roles.includes(adminRoleId);

  if (!hasAdmin) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const nombre = interaction.options.getInteger("nombre", true);
  const channel = interaction.channel as TextChannel;

  try {
    const deleted = await channel.bulkDelete(nombre, true);
    await interaction.reply({ content: `✅ ${deleted.size} message(s) supprimé(s).`, flags: 64 });
  } catch (err) {
    console.error("Failed to clear messages:", err);
    await interaction.reply({ content: "❌ Erreur lors de la suppression des messages.", flags: 64 });
  }
}
