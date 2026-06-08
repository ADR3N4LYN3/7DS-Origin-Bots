import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import {
  ROLE_PANEL_TITLE,
  ROLE_PANEL_THUMBNAIL,
  ROLE_PANEL_CATEGORIES,
  type RolePanelCategory,
} from "../config/roles.config.js";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━";

// ── Emoji parsing (unicode or custom <:name:id>) ────────────────────

function parseEmoji(raw: string): { name: string; id?: string; animated?: boolean } | string {
  const match = raw.match(/^<(a)?:(\w+):(\d+)>$/);
  if (match) return { animated: !!match[1], name: match[2], id: match[3] };
  return raw;
}

// ── Build embed description from config (bilingual) ──────────────────

function buildDescription(categories: RolePanelCategory[]): string {
  const blocks = categories.map((cat) => {
    // Évite "NOTIFICATIONS / NOTIFICATIONS" quand FR == EN.
    const title = cat.titleFr === cat.titleEn ? cat.titleFr : `${cat.titleFr} / ${cat.titleEn}`;
    const header = `${cat.emoji} **${title}**`;
    const lines = cat.items.map((it) => `${it.emoji} ⟶ **${it.label}**`);
    return [header, ...lines].join("\n");
  });

  return [
    blocks.join(`\n${DIVIDER}\n`),
    DIVIDER,
    "🇫🇷 Clique sur un bouton pour **obtenir** le rôle, reclique pour le **retirer**.",
    "🇬🇧 Click a button to **get** the role, click again to **remove** it.",
  ].join("\n");
}

// ── Build buttons grouped by category (one row per category) ────────
// Discord: max 5 buttons/row, max 5 rows. A category with >5 items spills
// onto an extra row.

function buildButtons(categories: RolePanelCategory[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (const cat of categories) {
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
  }

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

  const rows = buildButtons(ROLE_PANEL_CATEGORIES);
  if (rows.length > 5) {
    await interaction.reply({
      content: `❌ Trop de boutons : ${rows.length} lignes générées (max 5). Réduis le nombre de rôles dans la config.`,
      flags: 64,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setThumbnail(ROLE_PANEL_THUMBNAIL)
    .setDescription(buildDescription(ROLE_PANEL_CATEGORIES))
    .setFooter({ text: "7DS Origin" });

  if (bannerUrl) embed.setImage(bannerUrl);

  try {
    await channel.send({
      content: `# 🎭 ${ROLE_PANEL_TITLE.fr} / ${ROLE_PANEL_TITLE.en}`,
      embeds: [embed],
      components: rows,
    });
    await interaction.reply({ content: `✅ Panneau de rôles posté dans <#${channel.id}>.`, flags: 64 });
  } catch (err) {
    console.error("Failed to post roles panel:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du panneau de rôles.", flags: 64 });
  }
}
