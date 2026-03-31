import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { hasAdminRole, splitContent } from "../utils.js";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export function buildSondageCommand() {
  return new SlashCommandBuilder()
    .setName("sondage")
    .setDescription("Créer un sondage avec réactions (admin)")
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID du message à poster").setRequired(true),
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("options")
        .setDescription("Nombre de réactions numérotées à ajouter (2-10)")
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(10),
    )
    .addChannelOption((opt) =>
      opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
    );
}

export async function handleSondageCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const messageId = interaction.options.getString("message_id", true);
  const targetChannel = interaction.options.getChannel("channel", true) as TextChannel;
  const optionCount = interaction.options.getInteger("options", true);
  const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
    return;
  }

  const chunks = splitContent(original.content || "");

  try {
    let lastMsg;

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

      lastMsg = await targetChannel.send(payload);
    }

    if (lastMsg) {
      for (let i = 0; i < optionCount; i++) {
        await lastMsg.react(NUMBER_EMOJIS[i]);
      }
    }

    await interaction.reply({ content: `✅ Sondage publié dans <#${targetChannel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to send poll:", err);
    await interaction.reply({ content: "❌ Erreur lors de la création du sondage.", flags: 64 });
  }
}
