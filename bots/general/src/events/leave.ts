import { AuditLogEvent, EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  const user = member.user ?? member;
  const guild = member.guild;

  // Check audit log to distinguish leave vs kick
  let executor: string | null = null;
  let reason: string | null = null;
  let isKick = false;

  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 5,
    });

    const entry = logs.entries.find(
      (e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000,
    );

    if (entry) {
      isKick = true;
      executor = entry.executor ? `<@${entry.executor.id}>` : "Inconnu";
      reason = entry.reason ?? null;
    }
  } catch {
    // Bot may lack audit log perms — log as simple leave
  }

  const avatar = user.displayAvatarURL({ size: 128 });
  const joinedAt = member.joinedAt
    ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
    : "Inconnue";

  const roles = "cache" in (member.roles ?? {})
    ? [...member.roles.cache.filter((r) => r.id !== guild.id).values()]
        .map((r) => `<@&${r.id}>`)
        .join(", ") || "Aucun"
    : "Inconnu";

  const embed = new EmbedBuilder()
    .setColor(isKick ? LogColors.kick : LogColors.leave)
    .setAuthor({ name: isKick ? "Membre expulsé" : "Membre parti", iconURL: avatar })
    .setThumbnail(avatar)
    .setDescription(`**${user.tag ?? user.id}** — <@${user.id}>`)
    .addFields(
      { name: "Rejoint", value: joinedAt, inline: true },
      { name: "Membres", value: `${guild.memberCount}`, inline: true },
    )
    .setFooter({ text: `ID: ${user.id}` })
    .setTimestamp();

  if (roles !== "Inconnu") {
    embed.addFields({ name: "Rôles", value: roles.slice(0, 1024) });
  }

  if (isKick) {
    embed.addFields({ name: "Expulsé par", value: executor!, inline: true });
    if (reason) embed.addFields({ name: "Raison", value: reason, inline: true });
  }

  await sendLog(embed);
}
