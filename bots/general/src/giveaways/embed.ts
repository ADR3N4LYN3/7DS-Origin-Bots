import { EmbedBuilder } from "discord.js";
import type { Giveaway } from "./storage.js";

const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━";

export function buildGiveawayEmbed(g: Giveaway): EmbedBuilder {
  const endTs = Math.floor(g.endsAt / 1000);

  const desc = [
    SEP,
    `### 🎁  Lots à gagner`,
    "",
    `> 🥇  **1ʳᵉ place** — ${g.prize1}`,
    `> 🥈  **2ᵉ place** — ${g.prize2}`,
    `> 🥉  **3ᵉ place** — ${g.prize3}`,
    "",
    SEP,
    "",
    `🕐  **Tirage** <t:${endTs}:R> · <t:${endTs}:f>`,
    `👤  **Hôte** <@${g.hostId}>`,
    `🎟️  **Participants** \`${g.participants.length}\``,
    "",
    `*Clique sur* **🎉 Participer** *pour rejoindre le giveaway*`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({ name: "GIVEAWAY  ·  7DS Origin" })
    .setTitle("🎉  Tente ta chance !  🎉")
    .setDescription(desc)
    .setFooter({ text: `ID: ${g.messageId === "pending" ? "—" : g.messageId}` });

  if (g.thumbnailUrl) embed.setThumbnail(g.thumbnailUrl);
  if (g.imageUrl) embed.setImage(g.imageUrl);

  return embed;
}
