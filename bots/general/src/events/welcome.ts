import { EmbedBuilder, type GuildMember, type TextChannel } from "discord.js";

export async function handleGuildMemberAdd(member: GuildMember, welcomeChannelId: string) {
  const channel = member.guild.channels.cache.get(welcomeChannelId) as TextChannel | undefined;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription(
      `Bienvenue sur le serveur **${member.guild.name}** !\n\n` +
      `Tu es notre **${member.guild.memberCount}ème** membre. ` +
      `N'hésite pas à lire le règlement et à te présenter.`,
    )
    .setFooter({ text: "7DS Origin" });

  try {
    await channel.send({
      content: `# 👋 Bienvenue ${member} !`,
      embeds: [embed],
    });
  } catch (err) {
    console.error("Failed to send welcome message:", err);
  }
}
