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

export function buildRulesCommand() {
  return new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Poster un embed de règlement (admin)");
}

export async function handleRulesCommand(
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

  const modalId = `rules_modal_${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("📜 Règlement");

  const titreInput = new TextInputBuilder()
    .setCustomId("titre")
    .setLabel("Titre")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Contenu du règlement (Markdown supporté)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
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

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(description)
    .setFooter({ text: "7DS Origin" });

  const channel = interaction.channel as TextChannel;

  try {
    await channel.send({ content: `# 📜 ${titre}`, embeds: [embed] });
    await submit.reply({ content: "✅ Règlement publié.", flags: 64 });
  } catch (err) {
    console.error("Failed to send rules:", err);
    await submit.reply({ content: "❌ Erreur lors de l'envoi du règlement.", flags: 64 });
  }
}
