import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export function buildUserinfoCommand() {
  return new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Afficher les informations d'un membre")
    .addUserOption((opt) =>
      opt
        .setName("membre")
        .setDescription("Le membre à inspecter")
        .setRequired(false),
    );
}

export async function handleUserinfoCommand(
  interaction: ChatInputCommandInteraction,
) {
  const target = interaction.options.getUser("membre") ?? interaction.user;
  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "Utilisateur", value: `${target.tag}`, inline: true },
      { name: "ID", value: target.id, inline: true },
      { name: "Création du compte", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: "7DS Origin" });

  if (member) {
    if (member.joinedTimestamp) {
      embed.addFields({
        name: "Rejoint le serveur",
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
        inline: true,
      });
    }

    const roles = member.roles.cache
      .filter((r) => r.id !== interaction.guildId)
      .sort((a, b) => b.position - a.position)
      .map((r) => `${r}`)
      .join(", ");

    if (roles) {
      embed.addFields({ name: `Rôles (${member.roles.cache.size - 1})`, value: roles });
    }
  }

  await interaction.reply({ embeds: [embed], flags: 64 });
}
