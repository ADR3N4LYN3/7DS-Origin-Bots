import { AuditLogEvent, EmbedBuilder, type GuildBan } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleGuildBanAdd(ban: GuildBan) {
  const { user, guild } = ban;
  const avatar = user.displayAvatarURL({ size: 128 });

  let executor: string = "Inconnu";
  let reason: string = ban.reason ?? "Aucune raison";

  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5,
    });

    const entry = logs.entries.find(
      (e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000,
    );

    if (entry) {
      executor = entry.executor ? `<@${entry.executor.id}>` : "Inconnu";
      if (entry.reason) reason = entry.reason;
    }
  } catch {
    // Missing audit log perms
  }

  const embed = new EmbedBuilder()
    .setColor(LogColors.ban)
    .setAuthor({ name: "Membre banni", iconURL: avatar })
    .setThumbnail(avatar)
    .setDescription(`**${user.tag}** — <@${user.id}>`)
    .addFields(
      { name: "Banni par", value: executor, inline: true },
      { name: "Raison", value: reason, inline: true },
    )
    .setFooter({ text: `ID: ${user.id}` })
    .setTimestamp();

  await sendLog(embed);
}

export async function handleGuildBanRemove(ban: GuildBan) {
  const { user, guild } = ban;
  const avatar = user.displayAvatarURL({ size: 128 });

  let executor: string = "Inconnu";

  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanRemove,
      limit: 5,
    });

    const entry = logs.entries.find(
      (e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000,
    );

    if (entry?.executor) {
      executor = `<@${entry.executor.id}>`;
    }
  } catch {
    // Missing audit log perms
  }

  const embed = new EmbedBuilder()
    .setColor(LogColors.unban)
    .setAuthor({ name: "Membre débanni", iconURL: avatar })
    .setThumbnail(avatar)
    .setDescription(`**${user.tag}** — <@${user.id}>`)
    .addFields({ name: "Débanni par", value: executor, inline: true })
    .setFooter({ text: `ID: ${user.id}` })
    .setTimestamp();

  await sendLog(embed);
}
