import { EmbedBuilder, type GuildMember, type TextChannel } from "discord.js";

export interface WelcomeConfig {
  welcomeChannelId: string;
  rulesChannelId?: string;
  rolesChannelId?: string;
  bannerUrl?: string;
}

export async function handleGuildMemberAdd(member: GuildMember, config: WelcomeConfig) {
  const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel | undefined;
  if (!channel) return;

  const count = member.guild.memberCount;
  const avatar = member.user.displayAvatarURL({ size: 512 });

  const lines = [
    `Hey ${member}, bienvenue sur **${member.guild.name}** ! 🎉`,
    "",
    `Tu es notre **${count}ème** membre.`,
  ];

  if (config.rulesChannelId) {
    lines.push(`📜 Lis le règlement dans <#${config.rulesChannelId}>`);
  }

  if (config.rolesChannelId) {
    lines.push(`🎭 Choisis tes rôles dans <#${config.rolesChannelId}>`);
  }

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setAuthor({
      name: member.user.tag,
      iconURL: avatar,
    })
    .setThumbnail(avatar)
    .setDescription(lines.join("\n"))
    .setFooter({ text: `7DS Origin • Membre #${count}` })
    .setTimestamp();

  if (config.bannerUrl) {
    embed.setImage(config.bannerUrl);
  }

  try {
    await channel.send({
      content: `# 👋 Bienvenue ${member} !`,
      embeds: [embed],
    });
  } catch (err) {
    console.error("Failed to send welcome message:", err);
  }
}
