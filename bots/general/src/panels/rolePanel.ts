import {
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
  type Message,
  type TextChannel,
} from "discord.js";
import type { RolePanelCategory } from "../config/roles.config.js";

// ── Shared helpers for role/lang panels (Components V2) ─────────────

export function parseEmoji(raw: string): { name: string; id?: string; animated?: boolean } | string {
  const match = raw.match(/^<(a)?:(\w+):(\d+)>$/);
  if (match) return { animated: !!match[1], name: match[2], id: match[3] };
  return raw;
}

function categoryTitle(cat: RolePanelCategory): string {
  // Évite "NOTIFICATIONS / NOTIFICATIONS" quand FR == EN.
  return cat.titleFr === cat.titleEn ? cat.titleFr : `${cat.titleFr} / ${cat.titleEn}`;
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

// Nombre total de rangées de boutons (Discord en autorise 5 max par message).
export function countButtonRows(categories: RolePanelCategory[]): number {
  return categories.reduce((n, c) => n + Math.ceil(c.items.length / 5), 0);
}

export interface RolePanelOptions {
  titleEmoji: string;
  titleFr: string;
  titleEn: string;
  introFr: string;
  introEn: string;
  categories: RolePanelCategory[];
  iconUrl?: string | null;
  bannerUrl?: string;
}

// Construit la carte Components V2 : en-tête + (titre catégorie -> boutons) + intro + bannière.
export function buildRolePanelContainer(opts: RolePanelOptions): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(0xc9a84c);

  const headerText = new TextDisplayBuilder().setContent(
    `# ${opts.titleEmoji} ${opts.titleFr} / ${opts.titleEn}\n${opts.introFr}\n*${opts.introEn}*`,
  );

  if (opts.iconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(headerText)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(opts.iconUrl)),
    );
  } else {
    container.addTextDisplayComponents(headerText);
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
  );

  opts.categories.forEach((cat, idx) => {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${cat.emoji} ${categoryTitle(cat)}`),
    );
    for (const row of buildCategoryRows(cat)) {
      container.addActionRowComponents(row);
    }
    if (idx < opts.categories.length - 1) {
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

  if (opts.bannerUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(opts.bannerUrl)),
    );
  }

  return container;
}

// Poste un nouveau panneau, ou réédite un message existant si messageId est fourni.
// Renvoie le message, ou null si l'édition a échoué (ID introuvable / autre auteur).
export async function deliverPanel(
  channel: TextChannel,
  messageId: string | undefined,
  container: ContainerBuilder,
  opts: { react?: string } = {},
): Promise<Message | null> {
  if (messageId) {
    const target = await channel.messages.fetch(messageId).catch(() => null);
    if (!target) return null;
    return target.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }

  const sent = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  if (opts.react) await sent.react(opts.react).catch(() => {});
  return sent;
}
