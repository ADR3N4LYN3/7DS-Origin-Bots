import {
  type Client,
  type TextChannel,
  MessageFlags,
} from "discord.js";
import {
  loadGiveaways,
  updateGiveaway,
  findGiveaway,
  findEntry,
  participantIds,
  type Giveaway,
} from "./storage.js";
import { buildGiveawayContainer, buildAnnouncementContainer, maskUid } from "./render.js";
import { guildIconUrl } from "./card.js";
import { GIVEAWAY_WINNERS_CHANNEL_ID } from "./config.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";

const TIER_EMOJIS = ["🥇", "🥈", "🥉"] as const;
// Max safe setTimeout delay (~24.8 days)
const MAX_TIMEOUT = 2_147_483_647;

const timers = new Map<string, NodeJS.Timeout>();

async function getWinnersChannel(client: Client): Promise<TextChannel | null> {
  if (!GIVEAWAY_WINNERS_CHANNEL_ID) return null;
  const ch = await client.channels.fetch(GIVEAWAY_WINNERS_CHANNEL_ID).catch(() => null);
  return (ch && ch.isTextBased() ? (ch as TextChannel) : null);
}

// Donne l'accès (voir + écrire) au salon des gagnants et les tag dedans.
// Salon privé → pseudo et UID Lootbar y sont affichés en clair, pour livrer sans redemander.
async function grantWinnersAccess(
  client: Client,
  g: Giveaway,
  awards: { userId: string; tier: 1 | 2 | 3; prize: string }[],
) {
  if (awards.length === 0) return;
  const channel = await getWinnersChannel(client);
  if (!channel) return;

  const winnerIds = awards.map((a) => a.userId);
  for (const userId of winnerIds) {
    await channel.permissionOverwrites
      .edit(userId, { ViewChannel: true, SendMessages: true })
      .catch((err) => console.error(`Failed to grant winners-channel access to ${userId}:`, err));
  }

  const lines = awards.map((a) => {
    const entry = findEntry(g, a.userId);
    const ident = entry?.pseudo ? `\n↳ \`${entry.pseudo}\` — UID Lootbar \`${entry.uid}\`` : "";
    return `${TIER_EMOJIS[a.tier - 1]} <@${a.userId}> — ${a.prize}` + ident;
  });
  await channel.send({
    content: [
      "🎉 **Félicitations aux gagnants ! / Congratulations to the winners!**",
      ...lines,
      "",
      "Vous avez désormais accès à ce salon. / You now have access to this channel.",
    ].join("\n"),
    allowedMentions: { users: winnerIds },
  }).catch(() => {});
}

// Retire l'accès d'un ancien gagnant (utilisé au reroll).
async function revokeWinnerAccess(client: Client, userId: string) {
  const channel = await getWinnersChannel(client);
  if (!channel) return;
  await channel.permissionOverwrites.delete(userId).catch(() => {});
}

export function scheduleGiveaway(client: Client, g: Giveaway) {
  if (g.ended) return;

  const delay = g.endsAt - Date.now();

  if (delay <= 0) {
    void endGiveaway(client, g.messageId);
    return;
  }

  const timeout = Math.min(delay, MAX_TIMEOUT);
  const timer = setTimeout(() => {
    timers.delete(g.messageId);
    if (delay > MAX_TIMEOUT) {
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

function pickWinners(
  participants: string[],
  exclude: Set<string> = new Set(),
  count = 3,
): string[] {
  const eligible = participants.filter((id) => !exclude.has(id));
  if (eligible.length === 0) return [];

  // Fisher-Yates shuffle
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  return eligible.slice(0, count);
}

export async function endGiveaway(client: Client, messageId: string) {
  const g = findGiveaway(messageId);
  if (!g || g.ended) return;

  cancelScheduledGiveaway(messageId);

  // Number of winners = number of prizes filled
  const tierCount = 1 + (g.prize2 ? 1 : 0) + (g.prize3 ? 1 : 0);
  const winnerIds = pickWinners(participantIds(g), new Set(), tierCount);
  const winners: Giveaway["winners"] = winnerIds.map((userId, i) => ({
    tier: (i + 1) as 1 | 2 | 3,
    userId,
  }));

  updateGiveaway(messageId, { ended: true, winners });
  const ended = { ...g, ended: true, winners };

  const channel = (await client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return;

  const iconUrl = guildIconUrl(channel);
  const banner = bannerFile();
  const bannerUrl = banner ? BANNER_ATTACHMENT_URL : undefined;
  const files = banner ? [banner] : [];

  // Edit original message → état terminé + bouton désactivé
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    await message.edit({
      components: [buildGiveawayContainer(ended, { iconUrl, bannerUrl, ended: true })],
      files,
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  }

  // Annonce des résultats (en réponse au giveaway, ping les gagnants)
  await channel.send({
    components: [buildAnnouncementContainer(ended, { iconUrl, bannerUrl })],
    files,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: winnerIds },
    reply: { messageReference: messageId, failIfNotExists: false },
  }).catch(() => {});

  // Accès au salon des gagnants
  const prizes = [g.prize1, g.prize2, g.prize3];
  await grantWinnersAccess(
    client,
    ended,
    winners.map((w) => ({ userId: w.userId, tier: w.tier, prize: prizes[w.tier - 1] ?? "" })),
  );
}

export async function rerollGiveaway(
  client: Client,
  messageId: string,
  tier?: 1 | 2 | 3,
): Promise<{ success: boolean; newWinner?: string; tier?: 1 | 2 | 3; error?: string }> {
  const g = findGiveaway(messageId);
  if (!g) return { success: false, error: "Giveaway introuvable" };
  if (!g.ended) return { success: false, error: "Le giveaway n'est pas terminé" };

  const targetTier = tier ?? 1;
  const prizes = [g.prize1, g.prize2, g.prize3];
  if (!prizes[targetTier - 1]) {
    return { success: false, error: `Le lot ${targetTier} n'existe pas pour ce giveaway` };
  }

  const oldWinner = g.winners.find((w) => w.tier === targetTier)?.userId;
  const exclude = new Set(g.winners.map((w) => w.userId));

  const newWinners = pickWinners(participantIds(g), exclude, 1);
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
    const prize = prizes[targetTier - 1];
    const entry = findEntry(g, newWinner);
    // Salon public → UID masqué, comme dans l'annonce des résultats.
    const ident = entry?.pseudo ? ` · \`${entry.pseudo}\` · UID \`${maskUid(entry.uid)}\`` : "";
    await channel.send({
      content: `🎲 **Reroll** ${TIER_EMOJIS[targetTier - 1]} ${prize} : <@${newWinner}>${ident}`,
      allowedMentions: { users: [newWinner] },
      reply: { messageReference: messageId, failIfNotExists: false },
    });
  }

  // Accès au salon des gagnants : retire l'ancien, ajoute le nouveau
  if (oldWinner && oldWinner !== newWinner) await revokeWinnerAccess(client, oldWinner);
  await grantWinnersAccess(client, g, [
    { userId: newWinner, tier: targetTier, prize: prizes[targetTier - 1] ?? "" },
  ]);

  return { success: true, newWinner, tier: targetTier };
}
