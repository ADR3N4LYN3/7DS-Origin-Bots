import { EmbedBuilder, type Message, type PartialMessage } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleMessageUpdate(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
) {
  // Ignore DMs, bots, embeds-only edits (link previews)
  if (!newMessage.guild) return;
  if (newMessage.author?.bot) return;

  const oldContent = oldMessage.content;
  const newContent = newMessage.content;

  // Skip if content didn't actually change (embed update, pin, etc.)
  if (!oldContent || !newContent || oldContent === newContent) return;

  const author = newMessage.author;
  const avatar = author?.displayAvatarURL({ size: 128 }) ?? undefined;
  const messageUrl = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;

  const embed = new EmbedBuilder()
    .setColor(LogColors.update)
    .setAuthor({ name: "Message modifié", iconURL: avatar })
    .setDescription(
      [
        author ? `**Auteur :** <@${author.id}> — ${author.tag}` : "**Auteur :** Inconnu",
        `**Channel :** <#${newMessage.channel.id}> — [Aller au message](${messageUrl})`,
      ].join("\n"),
    )
    .addFields(
      { name: "Avant", value: oldContent.slice(0, 1024) },
      { name: "Après", value: newContent.slice(0, 1024) },
    )
    .setFooter({ text: `ID: ${newMessage.id}` })
    .setTimestamp();

  await sendLog(embed);
}
