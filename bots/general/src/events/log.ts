import { EmbedBuilder, type Client, type TextChannel } from "discord.js";

let logChannel: TextChannel | null = null;

export function initLogChannel(client: Client, channelId: string | undefined) {
  if (!channelId) return;
  const ch = client.channels.cache.get(channelId);
  if (ch?.isTextBased()) logChannel = ch as TextChannel;
}

export async function sendLog(embed: EmbedBuilder) {
  if (!logChannel) return;
  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to send log:", err);
  }
}

// ── Couleurs par type d'event ──────────────────────────────────────

export const LogColors = {
  join: 0x57f287,    // vert
  leave: 0xed4245,   // rouge
  kick: 0xf0b132,    // orange
  ban: 0xed4245,     // rouge
  unban: 0x57f287,   // vert
  update: 0x5865f2,  // bleu/indigo
} as const;
