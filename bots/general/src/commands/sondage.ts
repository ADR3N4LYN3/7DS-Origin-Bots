import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export function buildSondageCommand() {
  return new SlashCommandBuilder()
    .setName("sondage")
    .setDescription("Créer un sondage avec réactions");
}

export async function handleSondageCommand(
  interaction: ChatInputCommandInteraction,
) {
  const modalId = `sondage_modal_${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("📊 Sondage");

  const questionInput = new TextInputBuilder()
    .setCustomId("question")
    .setLabel("Question")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const optionsInput = new TextInputBuilder()
    .setCustomId("options")
    .setLabel("Options (une par ligne, max 10)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder("Option 1\nOption 2\nOption 3");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(questionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(optionsInput),
  );

  await interaction.showModal(modal);

  let submit: ModalSubmitInteraction;
  try {
    submit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === modalId,
      time: 300_000,
    });
  } catch {
    return;
  }

  const question = submit.fields.getTextInputValue("question");
  const rawOptions = submit.fields.getTextInputValue("options");

  const options = rawOptions
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10);

  if (options.length < 2) {
    await submit.reply({ content: "❌ Il faut au moins 2 options.", flags: 64 });
    return;
  }

  const description = options
    .map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setDescription(description)
    .setFooter({ text: "7DS Origin" });

  const channel = interaction.channel as TextChannel;

  try {
    const msg = await channel.send({ content: `# 📊 ${question}`, embeds: [embed] });

    for (let i = 0; i < options.length; i++) {
      await msg.react(NUMBER_EMOJIS[i]);
    }

    await submit.reply({ content: "✅ Sondage publié.", flags: 64 });
  } catch (err) {
    console.error("Failed to send poll:", err);
    await submit.reply({ content: "❌ Erreur lors de la création du sondage.", flags: 64 });
  }
}
