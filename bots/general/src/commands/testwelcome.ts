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

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "❌ Membre introuvable.", flags: 64 });
    return;
  }

  await handleGuildMemberAdd(member, welcomeConfig);
  await interaction.reply({ content: "✅ Message de bienvenue envoyé.", flags: 64 });
}
