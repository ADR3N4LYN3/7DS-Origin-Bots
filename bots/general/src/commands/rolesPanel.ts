import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  type TextChannel,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import {
  ROLE_PANEL_TITLE,
  ROLE_PANEL_CATEGORIES,
  type RolePanelCategory,
} from "../config/roles.config.js";

// ── Helpers ─────────────────────────────────────────────────────────

function parseEmoji(raw: string): { name: string; id?: string; animated?: boolean } | string {
  const match = raw.match(/^<(a)?:(\w+):(\d+)>$/);
  if (match) return { animated: !!match[1], name: match[2], id: match[3] };
  return raw;
}

function categoryTitle(cat: RolePanelCategory): string {
  // Évite "NOTIFICATIONS / NOTIFICATIONS" quand FR == EN.
  const title = cat.titleFr === cat.titleEn ? cat.titleFr : `${cat.titleFr} / ${cat.titleEn}`;
  return `${cat.emoji} ${title}`;
}

// Boutons d'une catégorie, répartis sur des rangées de 5 max.
function buildCategoryRows(cat: RolePanelCategory): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  for (const it of cat.items) {
    if (row.components.length >= 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`rr:${it.roleId}`)
        .setLabel(it.label)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(parseEmoji(it.emoji)),
    );
  }

  if (row.components.length > 0) rows.push(row);
  return rows;
}

// ── Command ─────────────────────────────────────────────────────────

export function buildRolesPanelCommand() {
  return new SlashCommandBuilder()
    .setName("roles-panel")
    .setDescription("Poster le panneau de rôles auto-attribuables depuis la config (admin)")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
    );
}

export async function handleRolesPanelCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
  bannerUrl?: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  // Garde-fou : Discord limite à 5 rangées de boutons par message.
  const totalRows = ROLE_PANEL_CATEGORIES.reduce((n, c) => n + Math.ceil(c.items.length / 5), 0);
  if (totalRows > 5) {
    await interaction.reply({
      content: `❌ Trop de boutons : ${totalRows} rangées générées (max 5). Réduis le nombre de rôles dans la config.`,
      flags: 64,
    });
    return;
  }

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });

  const container = new ContainerBuilder().setAccentColor(0xc9a84c);

  // En-tête : titre + intro, avec le logo du serveur en accessoire (haut droite).
  const headerText = new TextDisplayBuilder().setContent(
    `# 🎭 ${ROLE_PANEL_TITLE.fr} / ${ROLE_PANEL_TITLE.en}\n` +
      "Personnalise ton expérience sur le serveur.\n*Customize your server experience.*",
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

  // Une section par catégorie : titre puis ses boutons.
  ROLE_PANEL_CATEGORIES.forEach((cat, idx) => {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${categoryTitle(cat)}`),
    );
    for (const row of buildCategoryRows(cat)) {
      container.addActionRowComponents(row);
    }
    if (idx < ROLE_PANEL_CATEGORIES.length - 1) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      );
    }
  });

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "🇫🇷 Clique sur un bouton pour **obtenir** le rôle — reclique pour le **retirer**.\n" +
        "🇬🇧 Click a button to **get** the role — click again to **remove** it.",
    ),
  );

  if (bannerUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerUrl)),
    );
  }

  try {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.reply({ content: `✅ Panneau de rôles posté dans <#${channel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to post roles panel:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du panneau de rôles.", flags: 64 });
  }
}
