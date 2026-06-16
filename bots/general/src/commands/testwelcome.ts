import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import { handleGuildMemberAdd, type WelcomeConfig } from "../events/welcome.js";

export function buildTestWelcomeCommand() {
  return new SlashCommandBuilder()
    .setName("testwelcome")
    .setDescription("Simuler un message de bienvenue (admin)");
}

export async function handleTestWelcomeCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
  welcomeConfig: WelcomeConfig,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction.editReply({ content: "❌ Membre introuvable." });
    return;
  }

  await handleGuildMemberAdd(member, welcomeConfig);
  await interaction.editReply({ content: "✅ Message de bienvenue envoyé." });
}
