import { EmbedBuilder } from "discord.js";
import type { Giveaway } from "./storage.js";

const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━";

export type EmbedLang = "fr" | "en";

const I18N: Record<EmbedLang, {
  defaultTitle: string;
  defaultCta: string;
  prizesHeader: string;
  tier1: string;
  tier2: string;
  tier3: string;
  draw: string;
  host: string;
  participants: string;
}> = {
  fr: {
    defaultTitle: "🎉  Tente ta chance !  🎉",
    defaultCta: "*Clique sur* **🎉 Participer** *pour rejoindre le giveaway*",
    prizesHeader: "### 🎁  Lots à gagner",
    tier1: "1ʳᵉ place",
    tier2: "2ᵉ place",
    tier3: "3ᵉ place",
    draw: "Tirage",
    host: "Hôte",
    participants: "Participants",
  },
  en: {
    defaultTitle: "🎉  Try your luck !  🎉",
    defaultCta: "*Click* **🎉 Participate** *to join the giveaway*",
    prizesHeader: "### 🎁  Prizes to win",
    tier1: "1st place",
    tier2: "2nd place",
    tier3: "3rd place",
    draw: "Draw",
    host: "Host",
    participants: "Participants",
  },
};

export function buildGiveawayEmbed(g: Giveaway, lang: EmbedLang = "fr"): EmbedBuilder {
  const t = I18N[lang];
  const endTs = Math.floor(g.endsAt / 1000);

  const prizeLines: string[] = [`> 🥇  **${t.tier1}** — ${g.prize1}`];
  if (g.prize2) prizeLines.push(`> 🥈  **${t.tier2}** — ${g.prize2}`);
  if (g.prize3) prizeLines.push(`> 🥉  **${t.tier3}** — ${g.prize3}`);

  const desc = [
    SEP,
    t.prizesHeader,
    "",
    ...prizeLines,
    "",
    SEP,
    "",
    `🕐  **${t.draw}** <t:${endTs}:R> · <t:${endTs}:f>`,
    `👤  **${t.host}** <@${g.hostId}>`,
    `🎟️  **${t.participants}** \`${g.participants.length}\``,
    "",
    g.cta || t.defaultCta,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({ name: "GIVEAWAY  ·  7DS Origin" })
    .setTitle(g.title || t.defaultTitle)
    .setDescription(desc)
    .setFooter({ text: `ID: ${g.messageId === "pending" ? "—" : g.messageId}` });

  if (g.thumbnailUrl) embed.setThumbnail(g.thumbnailUrl);
  if (g.imageUrl) embed.setImage(g.imageUrl);

  return embed;
}
