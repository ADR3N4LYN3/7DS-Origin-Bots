import {
  type Client,
  type TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  loadGiveaways,
  updateGiveaway,
  findGiveaway,
  type Giveaway,
} from "./storage.js";

const TIER_EMOJIS = ["🥇", "🥈", "🥉"] as const;
// Max safe setTimeout delay (~24.8 days)
const MAX_TIMEOUT = 2_147_483_647;

const timers = new Map<string, NodeJS.Timeout>();

export function buildJoinButtonRow(messageId: string, participantCount: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:${messageId}:join`)
      .setLabel(`Participer (${participantCount})`)
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`gw:${messageId}:lang`)
      .setLabel("EN / FR")
      .setEmoji("🌐")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
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

function buildEndedEmbed(g: Giveaway, winners: { tier: 1 | 2 | 3; userId: string }[]): EmbedBuilder {
  const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━";
  const prizes = [g.prize1, g.prize2, g.prize3];
  const tierLabels = ["1ʳᵉ place", "2ᵉ place", "3ᵉ place"];

  const lines = [0, 1, 2]
    .filter((i) => prizes[i])
    .map((i) => {
      const w = winners.find((x) => x.tier === (i + 1));
      const winner = w ? `<@${w.userId}>` : "*Aucun gagnant*";
      return `> ${TIER_EMOJIS[i]}  **${tierLabels[i]}** — ${prizes[i]}\n>     ↳ ${winner}`;
    });

  const desc = [
    SEP,
    `### 🏆  Résultats du tirage`,
    "",
    ...lines,
    "",
    SEP,
    "",
    `🎟️  **Participants** \`${g.participants.length}\``,
    `👤  **Hôte** <@${g.hostId}>`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: "GIVEAWAY TERMINÉ  ·  7DS Origin" })
    .setTitle("🎊  Bravo aux gagnants !  🎊")
    .setDescription(desc)
    .setFooter({ text: "7DS Origin" })
    .setTimestamp();
}

export async function endGiveaway(client: Client, messageId: string) {
  const g = findGiveaway(messageId);
  if (!g || g.ended) return;

  cancelScheduledGiveaway(messageId);

  // Number of winners = number of prizes filled
  const tierCount = 1 + (g.prize2 ? 1 : 0) + (g.prize3 ? 1 : 0);
  const winnerIds = pickWinners(g.participants, new Set(), tierCount);
  const winners: Giveaway["winners"] = winnerIds.map((userId, i) => ({
    tier: (i + 1) as 1 | 2 | 3,
    userId,
  }));

  updateGiveaway(messageId, { ended: true, winners });

  const channel = (await client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return;

  // Edit original message to mark ended + disable button
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    const embed = EmbedBuilder.from(message.embeds[0])
      .setTitle("🎉 Giveaway terminé !")
      .setColor(0x808080);
    await message.edit({
      embeds: [embed],
      components: [buildJoinButtonRow(messageId, g.participants.length, true)],
    }).catch(() => {});
  }

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

  const targetTier = tier ?? 1;
  const prizes = [g.prize1, g.prize2, g.prize3];
  if (!prizes[targetTier - 1]) {
    return { success: false, error: `Le lot ${targetTier} n'existe pas pour ce giveaway` };
  }

  const exclude = new Set(g.winners.map((w) => w.userId));

  const newWinners = pickWinners(g.participants, exclude, 1);
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
