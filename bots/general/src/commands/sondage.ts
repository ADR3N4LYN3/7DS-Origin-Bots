import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

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

export function buildSondageCommand() {
  return new SlashCommandBuilder()
    .setName("sondage")
    .setDescription("Créer un sondage avec réactions")
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
      opt.setName("source").setDescription("Channel où se trouve le message (par défaut : channel actuel)").setRequired(false),
    );
}

export async function handleSondageCommand(
  interaction: ChatInputCommandInteraction,
) {
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
