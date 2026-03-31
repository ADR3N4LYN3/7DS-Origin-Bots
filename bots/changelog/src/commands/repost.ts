import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

function splitContent(text: string, max = 2000): string[] {
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

export function buildRepublishCommand() {
  return new SlashCommandBuilder()
    .setName("republish")
    .setDescription("Republier un message existant dans un autre channel (admin)")
    .addStringOption((opt) =>
      opt
        .setName("message_id")
        .setDescription("ID du message à reposter")
        .setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel cible")
        .setRequired(true),
    )
    .addRoleOption((opt) =>
      opt
        .setName("ping")
        .setDescription("Rôle à mentionner (optionnel)")
        .setRequired(false),
    )
    .addChannelOption((opt) =>
      opt
        .setName("source")
        .setDescription("Channel où se trouve le message (par défaut : channel actuel)")
        .setRequired(false),
    );
}

export async function handleRepublishCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
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

    // Split content into 2000-char chunks at line breaks
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

      await targetChannel.send(payload);
    }

    await interaction.reply({ content: `✅ Message reposté dans <#${targetChannel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to repost message:", err);
    await interaction.reply({ content: "❌ Erreur lors du repost.", flags: 64 });
  }
}
