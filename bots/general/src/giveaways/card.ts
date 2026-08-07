import { type Client, type TextChannel, MessageFlags } from "discord.js";
import { findGiveaway } from "./storage.js";
import { buildGiveawayContainer } from "./render.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";

export function guildIconUrl(channel: TextChannel): string | null {
  return channel.guild.iconURL({ size: 256 }) ?? channel.client.user?.displayAvatarURL({ size: 256 }) ?? null;
}

// Ré-édite la carte publique depuis l'état stocké (compteur de participants, état terminé).
// Appelée après chaque inscription / mise à jour / départ.
export async function refreshGiveawayCard(client: Client, messageId: string) {
  const g = findGiveaway(messageId);
  if (!g) return;

  const channel = (await client.channels.fetch(g.channelId).catch(() => null)) as TextChannel | null;
  if (!channel) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const banner = bannerFile();
  await message.edit({
    components: [
      buildGiveawayContainer(g, {
        iconUrl: guildIconUrl(channel),
        bannerUrl: banner ? BANNER_ATTACHMENT_URL : undefined,
        ended: g.ended,
      }),
    ],
    files: banner ? [banner] : [],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => {});
}
