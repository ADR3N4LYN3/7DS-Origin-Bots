import { AuditLogEvent, EmbedBuilder, type Message, type PartialMessage } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleMessageDelete(message: Message | PartialMessage) {
  // Ignore DMs, bot messages, and empty messages
  if (!message.guild) return;
  if (message.author?.bot) return;

  const content = message.content || "*Contenu non disponible*";
  const author = message.author;
  const channel = message.channel;

  // Try to find who deleted the message via audit log
  let executor: string | null = null;
  try {
    const logs = await message.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 5,
    });

    const entry = logs.entries.find(
      (e) =>
        e.target?.id === author?.id &&
        (e.extra as { channel?: { id: string } })?.channel?.id === channel.id &&
        Date.now() - e.createdTimestamp < 10_000,
    );

    if (entry?.executor && entry.executor.id !== author?.id) {
      executor = `<@${entry.executor.id}>`;
    }
  } catch {
    // Missing audit log perms
  }

  const avatar = author?.displayAvatarURL({ size: 128 }) ?? undefined;

  const embed = new EmbedBuilder()
    .setColor(LogColors.leave)
    .setAuthor({ name: "Message supprimé", iconURL: avatar })
    .setDescription(
      [
        author ? `**Auteur :** <@${author.id}> — ${author.tag}` : "**Auteur :** Inconnu",
        `**Channel :** <#${channel.id}>`,
        executor ? `**Supprimé par :** ${executor}` : null,
        "",
        content.slice(0, 1024),
      ]
        .filter((l) => l !== null)
        .join("\n"),
    )
    .setFooter({ text: `ID: ${message.id}` })
    .setTimestamp();

  // Attachments
  if (message.attachments && message.attachments.size > 0) {
    const files = message.attachments.map((a) => `[${a.name}](${a.url})`).join("\n");
    embed.addFields({ name: "Pièces jointes", value: files.slice(0, 1024) });
  }

  await sendLog(embed);
}
