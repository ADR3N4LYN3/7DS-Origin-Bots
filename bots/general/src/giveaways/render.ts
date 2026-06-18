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
import type { Giveaway } from "./storage.js";

const GOLD = 0xc9a84c;
const GREY = 0x808080;
const GREEN = 0x2ecc71;

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export type Lang = "fr" | "en" | "es" | "de";

export const LANG_BUTTONS: { code: Lang; emoji: string; label: string }[] = [
  { code: "en", emoji: "🇬🇧", label: "EN" },
  { code: "es", emoji: "🇪🇸", label: "ES" },
  { code: "de", emoji: "🇩🇪", label: "DE" },
];

const I18N: Record<Lang, {
  prizesHeader: string;
  tiers: [string, string, string];
  draw: string;
  host: string;
  participants: string;
  cta: string;
  join: string;
}> = {
  fr: {
    prizesHeader: "🎁 Lots à gagner",
    tiers: ["1ʳᵉ place", "2ᵉ place", "3ᵉ place"],
    draw: "Tirage",
    host: "Hôte",
    participants: "Participants",
    cta: "🎉 Clique sur **Participer** pour rejoindre — reclique pour quitter.",
    join: "Participer",
  },
  en: {
    prizesHeader: "🎁 Prizes",
    tiers: ["1st place", "2nd place", "3rd place"],
    draw: "Draw",
    host: "Host",
    participants: "Participants",
    cta: "🎉 Click **Participate** to join — click again to leave.",
    join: "Participate",
  },
  es: {
    prizesHeader: "🎁 Premios",
    tiers: ["1.er puesto", "2.º puesto", "3.er puesto"],
    draw: "Sorteo",
    host: "Anfitrión",
    participants: "Participantes",
    cta: "🎉 Pulsa **Participar** para unirte — vuelve a pulsar para salir.",
    join: "Participar",
  },
  de: {
    prizesHeader: "🎁 Preise",
    tiers: ["1. Platz", "2. Platz", "3. Platz"],
    draw: "Auslosung",
    host: "Gastgeber",
    participants: "Teilnehmer",
    cta: "🎉 Klicke auf **Teilnehmen**, um mitzumachen — erneut klicken zum Verlassen.",
    join: "Teilnehmen",
  },
};

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
      .setLabel(`${t.join} (${g.participants.length})`)
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
        `🎟️ **${t.participants}** \`${g.participants.length}\``,
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
      const who = w ? `<@${w.userId}>` : "*— Pas assez de participants / Not enough entrants —*";
      return `${MEDALS[i]} **${I18N.fr.tiers[i]} / ${I18N.en.tiers[i]}** — ${prizes[i]}\n↳ ${who}`;
    });
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 🏆 Résultats / Results\n${lines.join("\n\n")}`),
  );

  bigSep(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `🎟️ **Participants** \`${g.participants.length}\` · 👤 **Hôte / Host** <@${g.hostId}>`,
    ),
  );

  addBanner(container, opts.bannerUrl);
  return container;
}
