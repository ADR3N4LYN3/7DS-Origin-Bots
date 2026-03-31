import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

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

  // Chercher le message dans le channel actuel
  const sourceChannel = interaction.channel as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
    return;
  }

  try {
    const payload: { content?: string; embeds?: any[]; files?: any[] } = {};

    if (original.content) payload.content = original.content;
    if (original.embeds.length > 0) payload.embeds = original.embeds;
    if (original.attachments.size > 0) {
      payload.files = original.attachments.map((a) => ({
        attachment: a.url,
        name: a.name ?? undefined,
      }));
    }

    await targetChannel.send(payload);
    await interaction.reply({ content: `✅ Message reposté dans <#${targetChannel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to repost message:", err);
    await interaction.reply({ content: "❌ Erreur lors du repost.", flags: 64 });
  }
}
