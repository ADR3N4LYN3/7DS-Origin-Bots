import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  type TextChannel,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import { deliverPanel } from "../panels/rolePanel.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";
import {
  RULES_TITLE,
  RULES_INTRO,
  RULES,
  RULES_SANCTIONS,
  RULES_ACCEPT,
  type Rule,
} from "../config/rules.config.js";

// ── Helpers ─────────────────────────────────────────────────────────

function ruleLine(rule: Rule): string {
  const title = rule.titleFr === rule.titleEn ? rule.titleFr : `${rule.titleFr} / ${rule.titleEn}`;
  const desc = rule.descFr === rule.descEn ? rule.descFr : `${rule.descFr} / ${rule.descEn}`;
  return `${rule.emoji}  **${title}** — ${desc}`;
}

// ── Command ─────────────────────────────────────────────────────────

export function buildRulesPanelCommand() {
  return new SlashCommandBuilder()
    .setName("rules-panel")
    .setDescription("Poster le règlement stylé depuis la config (admin)")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID d'un règlement existant à mettre à jour (au lieu d'en poster un nouveau)").setRequired(false),
    );
}

export async function handleRulesPanelCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });

  const banner = bannerFile();

  const container = new ContainerBuilder().setAccentColor(0xc9a84c);

  // En-tête : titre + intro, logo serveur en accessoire.
  const headerText = new TextDisplayBuilder().setContent(
    `# 📜 ${RULES_TITLE.fr} / ${RULES_TITLE.en}\n${RULES_INTRO.fr}\n*${RULES_INTRO.en}*`,
  );

  if (iconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(headerText)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl)),
    );
  } else {
    container.addTextDisplayComponents(headerText);
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
  );

  // Liste des règles (un seul bloc texte, une règle par ligne).
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(RULES.map(ruleLine).join("\n\n")),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
  );

  // Sanctions + acceptation.
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `⚠️ ${RULES_SANCTIONS.fr}\n*${RULES_SANCTIONS.en}*\n\n` +
        `✅ ${RULES_ACCEPT.fr}\n*${RULES_ACCEPT.en}*`,
    ),
  );

  if (banner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(BANNER_ATTACHMENT_URL)),
    );
  }

  const messageId = interaction.options.getString("message_id") ?? undefined;

  try {
    const msg = await deliverPanel(channel, messageId, container, {
      react: "✅",
      files: banner ? [banner] : [],
    });
    if (!msg) {
      await interaction.reply({ content: "❌ Message introuvable dans ce channel (vérifie l'ID et le channel).", flags: 64 });
      return;
    }
    await interaction.reply({
      content: messageId ? "✅ Règlement mis à jour." : `✅ Règlement posté dans <#${channel.id}>.`,
      flags: 64,
    });
  } catch (err) {
    console.error("Failed to post rules panel:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du règlement.", flags: 64 });
  }
}
