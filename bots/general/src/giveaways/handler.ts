import { type ButtonInteraction, type TextChannel } from "discord.js";
import {
  findGiveaway,
  addParticipant,
  removeParticipant,
} from "./storage.js";
import { buildJoinButtonRow } from "./scheduler.js";
import { buildGiveawayEmbed } from "./embed.js";

export async function handleGiveawayButton(interaction: ButtonInteraction) {
  // customId format: gw:<messageId>:<action>
  const parts = interaction.customId.split(":");
  if (parts[0] !== "gw") return;

  const messageId = parts[1];
  const action = parts[2];
  const g = findGiveaway(messageId);

  if (!g) {
    await interaction.reply({ content: "❌ Giveaway introuvable.", flags: 64 });
    return;
  }

  if (action === "lang") {
    // Ephemeral preview in English
    const embed = buildGiveawayEmbed(g, "en");
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (action !== "join") return;

  if (g.ended) {
    await interaction.reply({ content: "❌ Ce giveaway est terminé.", flags: 64 });
    return;
  }

  const userId = interaction.user.id;
  const isParticipating = g.participants.includes(userId);

  let total: number;

  if (isParticipating) {
    const result = removeParticipant(messageId, userId);
    total = result.total;
    await interaction.reply({
      content: `🚪 Tu t'es désinscrit du giveaway.\nClique à nouveau pour reparticiper.`,
      flags: 64,
    });
  } else {
    const result = addParticipant(messageId, userId);
    total = result.total;
    await interaction.reply({
      content: `✅ Tu participes au giveaway !\nClique à nouveau pour annuler ta participation.`,
      flags: 64,
    });
  }

  // Update embed + button with new count
  const channel = (await interaction.client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const updated = findGiveaway(messageId);
  if (!updated) return;

  await message.edit({
    embeds: [buildGiveawayEmbed(updated)],
    components: [buildJoinButtonRow(messageId, total)],
  }).catch(() => {});
}
