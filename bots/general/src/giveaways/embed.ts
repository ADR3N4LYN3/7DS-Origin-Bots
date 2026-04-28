import { EmbedBuilder } from "discord.js";
import type { Giveaway } from "./storage.js";

const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━";

const DEFAULT_TITLE = "🎉  Tente ta chance !  🎉";
const DEFAULT_CTA = "*Clique sur* **🎉 Participer** *pour rejoindre le giveaway*";

export function buildGiveawayEmbed(g: Giveaway): EmbedBuilder {
  const endTs = Math.floor(g.endsAt / 1000);

  const prizeLines: string[] = [`> 🥇  **1ʳᵉ place** — ${g.prize1}`];
  if (g.prize2) prizeLines.push(`> 🥈  **2ᵉ place** — ${g.prize2}`);
  if (g.prize3) prizeLines.push(`> 🥉  **3ᵉ place** — ${g.prize3}`);

  const desc = [
    SEP,
    `### 🎁  Lots à gagner`,
    "",
    ...prizeLines,
    "",
    SEP,
    "",
    `🕐  **Tirage** <t:${endTs}:R> · <t:${endTs}:f>`,
    `👤  **Hôte** <@${g.hostId}>`,
    `🎟️  **Participants** \`${g.participants.length}\``,
    "",
    g.cta || DEFAULT_CTA,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({ name: "GIVEAWAY  ·  7DS Origin" })
    .setTitle(g.title || DEFAULT_TITLE)
    .setDescription(desc)
    .setFooter({ text: `ID: ${g.messageId === "pending" ? "—" : g.messageId}` });

  if (g.thumbnailUrl) embed.setThumbnail(g.thumbnailUrl);
  if (g.imageUrl) embed.setImage(g.imageUrl);

  return embed;
}
