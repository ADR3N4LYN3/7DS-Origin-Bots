import { GuildMemberRoleManager, type ChatInputCommandInteraction } from "discord.js";

export function hasAdminRole(interaction: ChatInputCommandInteraction, adminRoleId: string): boolean {
  const roles = interaction.member?.roles;
  return roles instanceof GuildMemberRoleManager
    ? roles.cache.has(adminRoleId)
    : Array.isArray(roles) && roles.includes(adminRoleId);
}
