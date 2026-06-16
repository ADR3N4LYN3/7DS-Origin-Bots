import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import { ROLE_PANEL_TITLE, ROLE_PANEL_CATEGORIES } from "../config/roles.config.js";
import { buildRolePanelContainer, countButtonRows, deliverPanel } from "../panels/rolePanel.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";

export function buildRolesPanelCommand() {
  return new SlashCommandBuilder()
    .setName("roles-panel")
    .setDescription("Poster le panneau de rôles auto-attribuables depuis la config (admin)")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID d'un panneau existant à mettre à jour (au lieu d'en poster un nouveau)").setRequired(false),
    );
}

export async function handleRolesPanelCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  if (countButtonRows(ROLE_PANEL_CATEGORIES) > 5) {
    await interaction.reply({
      content: "❌ Trop de boutons (max 5 rangées). Réduis le nombre de rôles dans la config.",
      flags: 64,
    });
    return;
  }

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });

  const banner = bannerFile();

  const container = buildRolePanelContainer({
    titleEmoji: "🎭",
    titleFr: ROLE_PANEL_TITLE.fr,
    titleEn: ROLE_PANEL_TITLE.en,
    introFr: "Personnalise ton expérience sur le serveur.",
    introEn: "Customize your server experience.",
    categories: ROLE_PANEL_CATEGORIES,
    iconUrl,
    bannerUrl: banner ? BANNER_ATTACHMENT_URL : undefined,
  });

  const messageId = interaction.options.getString("message_id") ?? undefined;

  try {
    const msg = await deliverPanel(channel, messageId, container, {
      files: banner ? [banner] : [],
    });
    if (!msg) {
      await interaction.reply({ content: "❌ Message introuvable dans ce channel (vérifie l'ID et le channel).", flags: 64 });
      return;
    }
    await interaction.reply({
      content: messageId ? "✅ Panneau de rôles mis à jour." : `✅ Panneau de rôles posté dans <#${channel.id}>.`,
      flags: 64,
    });
  } catch (err) {
    console.error("Failed to post roles panel:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du panneau de rôles.", flags: 64 });
  }
}
