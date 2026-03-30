import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface NewsPayload {
  id: number;
  title: string;
  category: string;
  lang: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
}

const CATEGORY_STYLE: Record<string, { emoji: string; color: number; badge: string }> = {
  Updates: {
    emoji: "🔧",
    color: 0x6694c3,
    badge: "https://sgimage.netmarble.com/images/netmarble/nanaori/20260309/qtry1773048427457.png",
  },
  Annonce: {
    emoji: "📢",
    color: 0x9273b8,
    badge: "https://sgimage.netmarble.com/images/netmarble/nanaori/20250722/yiaw1753166004235.png",
  },
  "Note des devs": {
    emoji: "💬",
    color: 0xb28768,
    badge: "https://sgimage.netmarble.com/images/netmarble/nanaori/20250722/p7pp1753166041929.png",
  },
  News: {
    emoji: "📰",
    color: 0x69a68d,
    badge: "https://sgimage.netmarble.com/images/netmarble/nanaori/20260309/yu601773049527440.png",
  },
  Événement: {
    emoji: "🎉",
    color: 0x68a4b2,
    badge: "https://sgimage.netmarble.com/images/netmarble/nanaori/20250722/f9dl1753166076377.png",
  },
};

const DEFAULT_STYLE = { emoji: "📄", color: 0x95a5a6, badge: "" };

export function buildNewsEmbed(payload: NewsPayload) {
  const style = CATEGORY_STYLE[payload.category] ?? DEFAULT_STYLE;

  const publishedDate = new Date(payload.publishedAt);
  const footerDate = publishedDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(`${style.emoji} ${payload.title}`)
    .setURL(payload.url)
    .setDescription(
      `> **${payload.category}** · ${payload.lang.toUpperCase()}\n\n` +
      `Veuillez consulter le site officiel pour plus d'informations.\n` +
      `▸ [Accéder au site officiel de **7DS Origin**](${payload.url})`,
    )
    .setFooter({ text: `7DS Origin • ${footerDate}` });

  if (payload.imageUrl) {
    embed.setImage(payload.imageUrl);
  } else if (style.badge) {
    embed.setImage(style.badge);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Lire l'article")
      .setURL(payload.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );

  return { embed, row };
}
