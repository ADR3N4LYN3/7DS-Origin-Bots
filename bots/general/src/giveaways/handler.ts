import { type ButtonInteraction, type TextChannel, MessageFlags } from "discord.js";
import {
  findGiveaway,
  addParticipant,
  removeParticipant,
} from "./storage.js";
import { buildGiveawayContainer, type Lang } from "./render.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";

const VALID_LANGS: Lang[] = ["fr", "en", "es", "de"];

export async function handleGiveawayButton(interaction: ButtonInteraction) {
  // customId format: gw:<messageId>:<action>[:<lang>]
  const parts = interaction.customId.split(":");
  if (parts[0] !== "gw") return;

  const messageId = parts[1];
  const action = parts[2];
  const g = findGiveaway(messageId);

  if (!g) {
    await interaction.reply({ content: "❌ Giveaway introuvable.", flags: 64 });
    return;
  }

  // Aperçu traduit (éphémère, sans boutons ni bannière)
  if (action === "lang") {
    const lang = parts[3] as Lang;
    if (!VALID_LANGS.includes(lang)) return;
    const container = buildGiveawayContainer(g, { lang, preview: true });
    await interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (action !== "join") return;

  if (g.ended) {
    await interaction.reply({ content: "❌ Ce giveaway est terminé. / This giveaway has ended.", flags: 64 });
    return;
  }

  const userId = interaction.user.id;
  const isParticipating = g.participants.includes(userId);

  if (isParticipating) {
    removeParticipant(messageId, userId);
    await interaction.reply({
      content: "🚪 Tu t'es désinscrit. Reclique pour reparticiper.\n*You left. Click again to rejoin.*",
      flags: 64,
    });
  } else {
    addParticipant(messageId, userId);
    await interaction.reply({
      content: "✅ Tu participes au giveaway !\n*You're in the giveaway!*",
      flags: 64,
    });
  }

  // Met à jour la carte (compteur de participants)
  const channel = (await interaction.client.channels.fetch(g.channelId)) as TextChannel | null;
  if (!channel) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const updated = findGiveaway(messageId);
  if (!updated) return;

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });
  const banner = bannerFile();

  await message.edit({
    components: [buildGiveawayContainer(updated, { iconUrl, bannerUrl: banner ? BANNER_ATTACHMENT_URL : undefined })],
    files: banner ? [banner] : [],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => {});
}
