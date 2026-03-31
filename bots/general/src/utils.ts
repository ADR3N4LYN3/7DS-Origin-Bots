import { GuildMemberRoleManager, type GuildMember, type ChatInputCommandInteraction } from "discord.js";

export function hasAdminRole(interaction: ChatInputCommandInteraction, adminRoleId: string): boolean {
  const roles = interaction.member?.roles;
  return roles instanceof GuildMemberRoleManager
    ? roles.cache.has(adminRoleId)
    : Array.isArray(roles) && roles.includes(adminRoleId);
}

export function splitContent(text: string, max = 2000): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= max) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", max);
    if (splitAt <= 0) splitAt = max;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, "");
  }

  return chunks;
}
