import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
  PermissionFlagsBits,
  type Client,
  type TextChannel,
} from "discord.js";

export function buildNewsCommand() {
  return new SlashCommandBuilder()
    .setName("news")
    .setDescription("Publier une annonce dans le channel annonces")
    .addSubcommand((sub) =>
      sub
        .setName("update")
        .setDescription("Publier une mise à jour")
        .addStringOption((opt) => opt.setName("titre").setDescription("Titre de la mise à jour").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Description de la mise à jour").setRequired(true))
        .addStringOption((opt) => opt.setName("lien").setDescription("Lien vers l'article").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("patchnote")
        .setDescription("Publier un patch note")
        .addStringOption((opt) => opt.setName("titre").setDescription("Titre du patch note").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Description du patch note").setRequired(true))
        .addStringOption((opt) => opt.setName("lien").setDescription("Lien vers le patch note").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leak")
        .setDescription("Publier un leak (admin uniquement)")
        .addStringOption((opt) => opt.setName("titre").setDescription("Titre du leak").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Description du leak").setRequired(true))
        .addStringOption((opt) => opt.setName("image").setDescription("URL de l'image").setRequired(false)),
    );
}

const SUBCOMMAND_CONFIG: Record<string, { color: number; label: string }> = {
  update:    { color: 0xc9a84c, label: "Mise à jour" },
  patchnote: { color: 0x56a8f5, label: "Patch Note" },
  leak:      { color: 0xffb938, label: "Leak" },
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

  const titre = interaction.options.getString("titre", true);
  const description = interaction.options.getString("description", true);
  const lien = interaction.options.getString("lien");
  const image = interaction.options.getString("image");

  const config = SUBCOMMAND_CONFIG[subcommand]!;
  const targetChannelId = subcommand === "leak" ? leaksChannelId : newsChannelId;

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(titre)
    .setDescription(description)
    .setFooter({ text: `7DS Origin • ${config.label}` })
    .setTimestamp();

  if (lien) {
    embed.addFields({ name: "🔗 Lien", value: `[Voir l'article](${lien})` });
  }

  if (image && subcommand === "leak") {
    embed.setImage(image);
  }

  try {
    const channel = (await interaction.client.channels.fetch(targetChannelId)) as TextChannel | null;
    if (!channel) {
      await interaction.reply({ content: "❌ Channel introuvable.", flags: 64 });
      return;
    }

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ ${config.label} publiée dans <#${targetChannelId}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to send news:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du message.", flags: 64 });
  }
}
