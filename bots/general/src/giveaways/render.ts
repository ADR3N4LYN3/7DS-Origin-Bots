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
} from "discord.js";
import { findEntry, type Giveaway } from "./storage.js";
import { I18N, LANG_BUTTONS, type Lang } from "./i18n.js";

const GOLD = 0xc9a84c;
const GREY = 0x808080;
const GREEN = 0x2ecc71;

const MEDALS = ["🥇", "🥈", "🥉"] as const;

// Identifiant Lootbar partiellement masqué pour les surfaces publiques (annonce
// des résultats, reroll). Le salon des gagnants et la liste admin l'affichent en
// clair. Les 4 derniers caractères suffisent au gagnant pour se reconnaître ; le
// préfixe `U` reste visible, il est commun à tous les UID Lootbar.
export function maskUid(uid: string): string {
  if (!uid) return "—";
  const KEEP = 4;
  if (uid.length <= KEEP + 1) return "*".repeat(uid.length);
  const head = uid.startsWith("U") ? "U" : "";
  return `${head}${"*".repeat(uid.length - head.length - KEEP)}${uid.slice(-KEEP)}`;
}

export interface GiveawayRenderOpts {
  iconUrl?: string | null;
  bannerUrl?: string;
  ended?: boolean;
  pending?: boolean; // 1ᵉʳ envoi : bouton désactivé tant que le messageId n'existe pas
  lang?: Lang; // langue d'affichage (défaut: fr)
  preview?: boolean; // aperçu éphémère : pas de boutons ni bannière
}

function addHeader(container: ContainerBuilder, titleLine: string, subtitle: string, iconUrl?: string | null) {
  const header = new TextDisplayBuilder().setContent(subtitle ? `${titleLine}\n${subtitle}` : titleLine);
  if (iconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(header)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl)),
    );
  } else {
    container.addTextDisplayComponents(header);
  }
}

function bigSep(container: ContainerBuilder) {
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
  );
}

function addBanner(container: ContainerBuilder, bannerUrl?: string) {
  if (!bannerUrl) return;
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerUrl)),
  );
}

function actionRow(g: Giveaway, t: typeof I18N[Lang], disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:${g.messageId}:join`)
      .setLabel(`${t.join} (${g.entries.length})`)
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
  for (const b of LANG_BUTTONS) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`gw:${g.messageId}:lang:${b.code}`)
        .setLabel(b.label)
        .setEmoji(b.emoji)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );
  }
  return row;
}

// Carte d'un giveaway (langue par défaut: FR). opts.preview = aperçu éphémère sans boutons/bannière.
export function buildGiveawayContainer(g: Giveaway, opts: GiveawayRenderOpts = {}): ContainerBuilder {
  const t = I18N[opts.lang ?? "fr"];
  const endTs = Math.floor(g.endsAt / 1000);
  const container = new ContainerBuilder().setAccentColor(opts.ended ? GREY : GOLD);

  const titleLine = opts.ended
    ? "# 🎉 Giveaway terminé / ended"
    : `# 🎉 ${g.title?.trim() || "Giveaway · 7DS Origin"}`;
  addHeader(container, titleLine, "", opts.iconUrl);

  bigSep(container);

  const prizes = [g.prize1, g.prize2, g.prize3];
  const prizeLines = [0, 1, 2]
    .filter((i) => prizes[i])
    .map((i) => `${MEDALS[i]} **${t.tiers[i]}** — ${prizes[i]}`);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### ${t.prizesHeader}\n\n${prizeLines.join("\n\n")}`),
  );

  bigSep(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `🕐 **${t.draw}** <t:${endTs}:R> · <t:${endTs}:f>`,
        `👤 **${t.host}** <@${g.hostId}>`,
        `🎟️ **${t.participants}** \`${g.entries.length}\``,
      ].join("\n\n"),
    ),
  );

  if (!opts.preview && !opts.ended) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(t.cta));
  }

  if (!opts.preview) {
    container.addActionRowComponents(actionRow(g, t, !!opts.ended || !!opts.pending));
    addBanner(container, opts.bannerUrl);
  }

  return container;
}

// Carte d'annonce des résultats (message séparé, bilingue FR/EN).
export function buildAnnouncementContainer(g: Giveaway, opts: GiveawayRenderOpts = {}): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(GREEN);

  addHeader(
    container,
    "# 🎊 Bravo aux gagnants !\n## 🎊 Congratulations!",
    "*Merci à tous les participants.*\n*Thanks to everyone who joined.*",
    opts.iconUrl,
  );

  bigSep(container);

  const prizes = [g.prize1, g.prize2, g.prize3];
  const lines = [0, 1, 2]
    .filter((i) => prizes[i])
    .map((i) => {
      const w = g.winners.find((x) => x.tier === (i + 1) as 1 | 2 | 3);
      if (!w) {
        return `${MEDALS[i]} **${prizes[i]}**\n↳ *Pas assez de participants*\n↳ *Not enough entrants*`;
      }
      const entry = findEntry(g, w.userId);
      // Lootbar masqué : l'annonce est publique, la valeur complète reste au
      // salon des gagnants. Champ facultatif, donc souvent absent.
      const bits = [
        entry?.pseudo ? `\`${entry.pseudo}\`` : null,
        entry?.uid ? `Lootbar \`${maskUid(entry.uid)}\`` : null,
      ].filter(Boolean);
      const ident = bits.length ? ` · ${bits.join(" · ")}` : "";
      return `${MEDALS[i]} **${prizes[i]}**\n↳ <@${w.userId}>${ident}`;
    });
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 🏆 Résultats\n### 🏆 Results\n\n${lines.join("\n\n")}`),
  );

  bigSep(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `🎟️ **Participants** \`${g.entries.length}\`\n\n👤 **Hôte** <@${g.hostId}>`,
    ),
  );

  addBanner(container, opts.bannerUrl);
  return container;
}
