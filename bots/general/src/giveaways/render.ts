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

const TIER = [
  "🥇 **1ʳᵉ place / 1st**",
  "🥈 **2ᵉ place / 2nd**",
  "🥉 **3ᵉ place / 3rd**",
];

export interface GiveawayRenderOpts {
  iconUrl?: string | null;
  bannerUrl?: string;
  ended?: boolean;
  pending?: boolean; // 1ᵉʳ envoi : bouton désactivé tant que le messageId n'existe pas
}

function joinButtonRow(messageId: string, count: number, disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:${messageId}:join`)
      .setLabel(`Participer / Join (${count})`)
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

function addHeader(container: ContainerBuilder, titleLine: string, subtitle: string, iconUrl?: string | null) {
  const header = new TextDisplayBuilder().setContent(`${titleLine}\n${subtitle}`);
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

// Carte d'un giveaway en cours (ou terminé si opts.ended).
export function buildGiveawayContainer(g: Giveaway, opts: GiveawayRenderOpts = {}): ContainerBuilder {
  const endTs = Math.floor(g.endsAt / 1000);
  const container = new ContainerBuilder().setAccentColor(opts.ended ? GREY : GOLD);

  const titleLine = opts.ended
    ? "# 🎉 Giveaway terminé / Giveaway ended"
    : `# 🎉 ${g.title?.trim() || "Giveaway · 7DS Origin"}`;
  const subtitle = opts.ended
    ? "*Le tirage est terminé. / The draw is over.*"
    : "**Tente ta chance ! / Try your luck!**";
  addHeader(container, titleLine, subtitle, opts.iconUrl);

  bigSep(container);

  const prizes = [g.prize1, g.prize2, g.prize3];
  const prizeLines = [0, 1, 2].filter((i) => prizes[i]).map((i) => `${TIER[i]} — ${prizes[i]}`);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### 🎁 Lots à gagner / Prizes\n${prizeLines.join("\n")}`),
  );

  bigSep(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `🕐 **Tirage / Draw** <t:${endTs}:R> · <t:${endTs}:f>`,
        `👤 **Hôte / Host** <@${g.hostId}>`,
        `🎟️ **Participants** \`${g.participants.length}\``,
      ].join("\n"),
    ),
  );

  if (!opts.ended) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "🇫🇷 Clique sur **🎉 Participer** pour rejoindre — reclique pour quitter.\n" +
          "🇬🇧 Click **🎉 Participate** to join — click again to leave.",
      ),
    );
  }

  container.addActionRowComponents(
    joinButtonRow(g.messageId, g.participants.length, !!opts.ended || !!opts.pending),
  );

  addBanner(container, opts.bannerUrl);
  return container;
}

// Carte d'annonce des résultats (message séparé en réponse au giveaway).
export function buildAnnouncementContainer(g: Giveaway, opts: GiveawayRenderOpts = {}): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(GREEN);

  addHeader(
    container,
    "# 🎊 Bravo aux gagnants ! / Congratulations!",
    "*Merci à tous les participants. / Thanks to everyone who joined.*",
    opts.iconUrl,
  );

  bigSep(container);

  const prizes = [g.prize1, g.prize2, g.prize3];
  const lines = [0, 1, 2]
    .filter((i) => prizes[i])
    .map((i) => {
      const w = g.winners.find((x) => x.tier === (i + 1) as 1 | 2 | 3);
      const who = w ? `<@${w.userId}>` : "*— Pas assez de participants / Not enough entrants —*";
      return `${TIER[i]} — ${prizes[i]}\n↳ ${who}`;
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
