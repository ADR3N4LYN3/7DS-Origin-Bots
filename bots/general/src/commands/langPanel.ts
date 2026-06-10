import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  type TextChannel,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import { LANG_PANEL_TITLE, LANG_PANEL_CATEGORIES } from "../config/lang.config.js";
import { buildRolePanelContainer, countButtonRows } from "../panels/rolePanel.js";

export function buildLangPanelCommand() {
  return new SlashCommandBuilder()
    .setName("lang-panel")
    .setDescription("Poster le panneau des rôles de langue depuis la config (admin)")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
    );
}

export async function handleLangPanelCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
  bannerUrl?: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  if (countButtonRows(LANG_PANEL_CATEGORIES) > 5) {
    await interaction.reply({
      content: "❌ Trop de boutons (max 5 rangées). Réduis le nombre de langues dans la config.",
      flags: 64,
    });
    return;
  }

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });

  const container = buildRolePanelContainer({
    titleEmoji: "🌍",
    titleFr: LANG_PANEL_TITLE.fr,
    titleEn: LANG_PANEL_TITLE.en,
    introFr: "Sélectionne la ou les langues que tu parles.",
    introEn: "Select the language(s) you speak.",
    categories: LANG_PANEL_CATEGORIES,
    iconUrl,
    bannerUrl,
  });

  try {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.reply({ content: `✅ Panneau des langues posté dans <#${channel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to post lang panel:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du panneau des langues.", flags: 64 });
  }
}
