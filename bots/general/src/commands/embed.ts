import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

export function buildEmbedCommand() {
  return new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Créer un embed personnalisé (admin)");
}

export async function handleEmbedCommand(
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

  const modalId = `embed_modal_${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("✏️ Embed personnalisé");

  const titreInput = new TextInputBuilder()
    .setCustomId("titre")
    .setLabel("Titre")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description (Markdown supporté)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  const colorInput = new TextInputBuilder()
    .setCustomId("color")
    .setLabel("Couleur hex (ex: #5865F2, optionnel)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7);

  const imageInput = new TextInputBuilder()
    .setCustomId("image")
    .setLabel("URL image (optionnel)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
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

  const titre = submit.fields.getTextInputValue("titre");
  const description = submit.fields.getTextInputValue("description");
  const colorRaw = submit.fields.getTextInputValue("color") || null;
  const image = submit.fields.getTextInputValue("image") || null;

  const color = colorRaw ? parseInt(colorRaw.replace("#", ""), 16) : 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(description)
    .setFooter({ text: "7DS Origin" });

  if (image) embed.setImage(image);

  const channel = interaction.channel as TextChannel;

  try {
    await channel.send({ content: `# ${titre}`, embeds: [embed] });
    await submit.reply({ content: "✅ Embed publié.", flags: 64 });
  } catch (err) {
    console.error("Failed to send embed:", err);
    await submit.reply({ content: "❌ Erreur lors de l'envoi de l'embed.", flags: 64 });
  }
}
