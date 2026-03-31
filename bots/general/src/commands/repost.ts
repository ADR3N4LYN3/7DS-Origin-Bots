import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { hasAdminRole, splitContent } from "../utils.js";

export function buildRepostCommand() {
  return new SlashCommandBuilder()
    .setName("repost")
    .setDescription("Reposter un message existant dans un autre channel (admin)")
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID du message à reposter").setRequired(true),
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible").setRequired(true),
    )
    .addRoleOption((opt) =>
      opt.setName("ping").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName("emojis").setDescription("Emojis à ajouter en réaction (séparés par des espaces)").setRequired(false),
    )
    .addChannelOption((opt) =>
      opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
    );
}

export async function handleRepostCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const messageId = interaction.options.getString("message_id", true);
  const targetChannel = interaction.options.getChannel("channel", true) as TextChannel;
  const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
    return;
  }

  try {
    const pingRole = interaction.options.getRole("ping");
    const mention = pingRole ? `<@&${pingRole.id}>` : "";
    const fullContent = [mention, original.content].filter(Boolean).join("\n");
    const chunks = splitContent(fullContent);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const payload: { content?: string; embeds?: any[]; files?: any[] } = {};

      if (chunks[i]) payload.content = chunks[i];

      if (isLast) {
        if (original.embeds.length > 0) payload.embeds = original.embeds;
        if (original.attachments.size > 0) {
          payload.files = original.attachments.map((a) => ({
            attachment: a.url,
            name: a.name ?? undefined,
          }));
        }
      }

      const sent = await targetChannel.send(payload);

      if (isLast) {
        const rawEmojis = interaction.options.getString("emojis");
        if (rawEmojis) {
          const emojis = rawEmojis.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:\w+:\d+>/gu) ?? [];
          for (const emoji of emojis) {
            await sent.react(emoji).catch((err) =>
              console.error(`Failed to react with ${emoji}:`, err),
            );
          }
        }
      }
    }

    await interaction.reply({ content: `✅ Message reposté dans <#${targetChannel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to repost message:", err);
    await interaction.reply({ content: "❌ Erreur lors du repost.", flags: 64 });
  }
}
