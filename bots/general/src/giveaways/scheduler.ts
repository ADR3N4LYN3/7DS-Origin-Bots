import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import {
  loadGiveaways,
  updateGiveaway,
  findGiveaway,
  type Giveaway,
} from "./storage.js";

export const GIVEAWAY_EMOJI = "🎉";
const TIER_EMOJIS = ["🥇", "🥈", "🥉"] as const;
// Max safe setTimeout delay (~24.8 days)
const MAX_TIMEOUT = 2_147_483_647;

const timers = new Map<string, NodeJS.Timeout>();

export function scheduleGiveaway(client: Client, g: Giveaway) {
  if (g.ended) return;

  const delay = g.endsAt - Date.now();

  // Already past — end immediately
  if (delay <= 0) {
    void endGiveaway(client, g.messageId);
    return;
  }

  // Schedule (chain if too far in the future)
  const timeout = Math.min(delay, MAX_TIMEOUT);
  const timer = setTimeout(() => {
    timers.delete(g.messageId);
    if (delay > MAX_TIMEOUT) {
      // Re-schedule the rest
      const next = findGiveaway(g.messageId);
      if (next) scheduleGiveaway(client, next);
    } else {
      void endGiveaway(client, g.messageId);
    }
  }, timeout);

  timers.set(g.messageId, timer);
}

export function cancelScheduledGiveaway(messageId: string) {
  const timer = timers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(messageId);
  }
}

export async function restoreGiveaways(client: Client) {
  const all = loadGiveaways();
  for (const g of all) {
    if (!g.ended) scheduleGiveaway(client, g);
  }
  console.log(`Restored ${all.filter((g) => !g.ended).length} active giveaways`);
}

async function pickWinners(
  client: Client,
  g: Giveaway,
  exclude: Set<string> = new Set(),
): Promise<string[]> {
  const channel = (await client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return [];

  const message = await channel.messages.fetch(g.messageId).catch(() => null);
  if (!message) return [];

  const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
  if (!reaction) return [];

  const users = await reaction.users.fetch();
  const eligible = users
    .filter((u) => !u.bot && !exclude.has(u.id))
    .map((u) => u.id);

  if (eligible.length === 0) return [];

  // Shuffle Fisher-Yates
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  return eligible.slice(0, 3);
}

function buildEndedEmbed(g: Giveaway, winners: { tier: 1 | 2 | 3; userId: string }[]): EmbedBuilder {
  const prizes = [g.prize1, g.prize2, g.prize3];
  const lines = [0, 1, 2].map((i) => {
    const w = winners.find((x) => x.tier === (i + 1));
    const winner = w ? `<@${w.userId}>` : "*Aucun gagnant*";
    return `${TIER_EMOJIS[i]} **${prizes[i]}** — ${winner}`;
  });

  return new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle("🎉 Giveaway terminé !")
    .setDescription(lines.join("\n"))
    .addFields({ name: "Hôte", value: `<@${g.hostId}>` })
    .setFooter({ text: "7DS Origin" })
    .setTimestamp();
}

export async function endGiveaway(client: Client, messageId: string) {
  const g = findGiveaway(messageId);
  if (!g || g.ended) return;

  cancelScheduledGiveaway(messageId);

  const winnerIds = await pickWinners(client, g);
  const winners: Giveaway["winners"] = winnerIds.map((userId, i) => ({
    tier: (i + 1) as 1 | 2 | 3,
    userId,
  }));

  updateGiveaway(messageId, { ended: true, winners });

  const channel = (await client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return;

  // Edit original message to mark ended
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    const embed = EmbedBuilder.from(message.embeds[0])
      .setTitle("🎉 Giveaway terminé !")
      .setColor(0x808080);
    await message.edit({ embeds: [embed] }).catch(() => {});
  }

  // Announce winners
  const announcement = buildEndedEmbed(g, winners);
  const mentions = winners.map((w) => `<@${w.userId}>`).join(" ");
  await channel.send({
    content: winners.length > 0 ? `Félicitations ${mentions} !` : "Personne n'a participé 😢",
    embeds: [announcement],
    reply: { messageReference: messageId, failIfNotExists: false },
  });
}

export async function rerollGiveaway(
  client: Client,
  messageId: string,
  tier?: 1 | 2 | 3,
): Promise<{ success: boolean; newWinner?: string; tier?: 1 | 2 | 3; error?: string }> {
  const g = findGiveaway(messageId);
  if (!g) return { success: false, error: "Giveaway introuvable" };
  if (!g.ended) return { success: false, error: "Le giveaway n'est pas terminé" };

  // If tier not specified, reroll tier 1 by default
  const targetTier = tier ?? 1;
  const exclude = new Set(g.winners.map((w) => w.userId));

  const newWinners = await pickWinners(client, g, exclude);
  if (newWinners.length === 0) {
    return { success: false, error: "Aucun participant éligible pour le reroll" };
  }

  const newWinner = newWinners[0];
  const updatedWinners = g.winners.filter((w) => w.tier !== targetTier);
  updatedWinners.push({ tier: targetTier, userId: newWinner });
  updatedWinners.sort((a, b) => a.tier - b.tier);

  updateGiveaway(messageId, { winners: updatedWinners });

  const channel = (await client.channels.fetch(g.channelId)) as TextChannel | null;
  if (channel) {
    const prize = [g.prize1, g.prize2, g.prize3][targetTier - 1];
    await channel.send({
      content: `🎲 **Reroll** ${TIER_EMOJIS[targetTier - 1]} ${prize} : <@${newWinner}>`,
      reply: { messageReference: messageId, failIfNotExists: false },
    });
  }

  return { success: true, newWinner, tier: targetTier };
}
