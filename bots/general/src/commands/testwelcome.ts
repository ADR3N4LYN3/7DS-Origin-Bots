import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
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
  const roles = interaction.member?.roles;
  const hasAdmin =
    roles instanceof GuildMemberRoleManager
      ? roles.cache.has(adminRoleId)
      : Array.isArray(roles) && roles.includes(adminRoleId);

  if (!hasAdmin) {
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
