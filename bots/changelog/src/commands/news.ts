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

export function buildNewsCommand() {
  return new SlashCommandBuilder()
    .setName("news")
    .setDescription("Publier une annonce dans le channel annonces")
    .addSubcommand((sub) =>
      sub.setName("update").setDescription("Publier une mise à jour"),
    )
    .addSubcommand((sub) =>
      sub.setName("patchnote").setDescription("Publier un patch note"),
    )
    .addSubcommand((sub) =>
      sub.setName("leak").setDescription("Publier un leak (admin uniquement)"),
    );
}

const SUBCOMMAND_CONFIG: Record<string, { emoji: string; color: number; label: string }> = {
  update:    { emoji: "🔧", color: 0xc9a84c, label: "Mise à jour" },
  patchnote: { emoji: "📋", color: 0x56a8f5, label: "Patch Note" },
  leak:      { emoji: "🔮", color: 0xffb938, label: "Leak" },
};

export async function handleNewsCommand(
  interaction: ChatInputCommandInteraction,
  newsChannelId: string,
  leaksChannelId: string,
  adminRoleId: string,
) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "leak") {
    const roles = interaction.member?.roles;
    const hasAdmin =
      roles instanceof GuildMemberRoleManager
        ? roles.cache.has(adminRoleId)
        : Array.isArray(roles) && roles.includes(adminRoleId);

    if (!hasAdmin) {
      await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
      return;
    }
  }

  const config = SUBCOMMAND_CONFIG[subcommand]!;
  const modalId = `news_modal_${subcommand}_${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(`${config.emoji} ${config.label}`);

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

  const imageInput = new TextInputBuilder()
    .setCustomId("image")
    .setLabel("URL image (optionnel)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const rows = [
    new ActionRowBuilder<TextInputBuilder>().addComponents(titreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
  ];

  if (subcommand === "leak") {
    const image2Input = new TextInputBuilder()
      .setCustomId("image2")
      .setLabel("URL 2e image (optionnel)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(image2Input));
  }

  modal.addComponents(...rows);

  await interaction.showModal(modal);

  // Wait for modal submission (5 min timeout)
  let submit: ModalSubmitInteraction;
  try {
    submit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === modalId,
      time: 300_000,
    });
  } catch {
    return; // Timeout — user didn't submit
  }

  const titre = submit.fields.getTextInputValue("titre");
  const description = submit.fields.getTextInputValue("description");
  const image = submit.fields.getTextInputValue("image") || null;
  const image2 = subcommand === "leak"
    ? submit.fields.getTextInputValue("image2") || null
    : null;

  const targetChannelId = subcommand === "leak" ? leaksChannelId : newsChannelId;

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setAuthor({ name: `${config.emoji} ${config.label}` })
    .setTitle(titre)
    .setDescription(description)
    .setFooter({ text: "7DS Origin" });

  if (image) embed.setImage(image);

  const embeds: EmbedBuilder[] = [embed];

  if (image2) {
    embed.setURL("https://7dsorigin.app");
    embeds.push(
      new EmbedBuilder()
        .setURL("https://7dsorigin.app")
        .setImage(image2)
        .setColor(config.color),
    );
  }

  try {
    const channel = (await submit.client.channels.fetch(targetChannelId)) as TextChannel | null;
    if (!channel) {
      await submit.reply({ content: "❌ Channel introuvable.", flags: 64 });
      return;
    }

    await channel.send({ embeds });
    await submit.reply({ content: `✅ ${config.label} publiée dans <#${targetChannelId}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to send news:", err);
    await submit.reply({ content: "❌ Erreur lors de l'envoi du message.", flags: 64 });
  }
}
