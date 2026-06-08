import {
  type Client,
  type TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { Platform, Subscription } from "./config/storage.js";

export interface NotificationData {
  kind: Platform;
  name: string;
  title: string;
  url: string;
  thumbnail?: string | null;
  avatar?: string | null;
  game?: string | null;
  login?: string | null;
  viewers?: number | null;
}

const DEFAULT_TEMPLATES: Record<Platform, string> = {
  youtube: "{role} 📺 **{name}** vient de publier une nouvelle vidéo !\n{url}",
  twitch: "{role} 🔴 **{name}** est en live !\n{url}",
};

// Placeholders usable in a custom /notif message:
// {role} {name} {title} {url} {game} {login}
function applyTemplate(tpl: string, data: NotificationData, roleMention: string): string {
  return tpl
    .replaceAll("{role}", roleMention)
    .replaceAll("{name}", data.name)
    .replaceAll("{title}", data.title)
    .replaceAll("{url}", data.url)
    .replaceAll("{game}", data.game ?? "")
    .replaceAll("{login}", data.login ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function buildEmbed(data: NotificationData): EmbedBuilder {
  const isYouTube = data.kind === "youtube";
  const embed = new EmbedBuilder()
    .setColor(isYouTube ? 0xff0000 : 0x9146ff)
    .setAuthor({
      name: isYouTube ? `${data.name} · YouTube` : `${data.name} · Twitch`,
      iconURL: data.avatar ?? undefined,
      url: data.url,
    })
    .setTitle(data.title.slice(0, 256) || data.name)
    .setURL(data.url)
    .setFooter({ text: "7DS Origin" })
    .setTimestamp();

  if (data.game) embed.addFields({ name: "Catégorie", value: data.game, inline: true });
  if (typeof data.viewers === "number") {
    embed.addFields({ name: "Spectateurs", value: `${data.viewers.toLocaleString("fr-FR")}`, inline: true });
  }
  if (data.thumbnail) embed.setImage(data.thumbnail);
  return embed;
}

function buildButtonRow(data: NotificationData): ActionRowBuilder<ButtonBuilder> {
  const isYouTube = data.kind === "youtube";
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(data.url)
      .setLabel(isYouTube ? "Regarder la vidéo" : "Regarder le live")
      .setEmoji(isYouTube ? "▶️" : "🔴"),
  );
}

export async function sendNotification(
  client: Client,
  sub: Subscription,
  data: NotificationData,
): Promise<void> {
  const channel = (await client.channels
    .fetch(sub.discordChannelId)
    .catch(() => null)) as TextChannel | null;
  if (!channel || !("send" in channel)) {
    console.error(`Notification channel ${sub.discordChannelId} not found for ${sub.sourceName}`);
    return;
  }

  const roleMention = sub.roleId ? `<@&${sub.roleId}>` : "";
  const content = applyTemplate(sub.message || DEFAULT_TEMPLATES[data.kind], data, roleMention);

  await channel.send({
    content: content || undefined,
    embeds: [buildEmbed(data)],
    components: [buildButtonRow(data)],
    allowedMentions: { parse: [], roles: sub.roleId ? [sub.roleId] : [] },
  });
}
