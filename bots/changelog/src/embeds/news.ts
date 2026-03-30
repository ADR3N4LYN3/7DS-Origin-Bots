import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface NewsPayload {
  id: number;
  title: string;
  content?: string | null;
  category: string;
  lang: string;
  url: string;
  imageUrl?: string | null;
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

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&lsquo;": "\u2018", "&rsquo;": "\u2019", "&ldquo;": "\u201C", "&rdquo;": "\u201D",
  "&ndash;": "\u2013", "&mdash;": "\u2014", "&hellip;": "\u2026", "&nbsp;": " ",
  "&Eacute;": "É", "&eacute;": "é", "&Egrave;": "È", "&egrave;": "è",
  "&Ecirc;": "Ê", "&ecirc;": "ê", "&Agrave;": "À", "&agrave;": "à",
  "&Acirc;": "Â", "&acirc;": "â", "&Ocirc;": "Ô", "&ocirc;": "ô",
  "&Ucirc;": "Û", "&ucirc;": "û", "&Ugrave;": "Ù", "&ugrave;": "ù",
  "&Ccedil;": "Ç", "&ccedil;": "ç", "&Iuml;": "Ï", "&iuml;": "ï",
};

function decodeHtmlEntities(text: string): string {
  let decoded = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char);
  }
  // Handle numeric entities like &#233; and &#x00E9;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  return decoded;
}

export function buildNewsEmbed(payload: NewsPayload) {
  const style = CATEGORY_STYLE[payload.category] ?? DEFAULT_STYLE;
  const title = decodeHtmlEntities(payload.title);

  const publishedDate = new Date(payload.publishedAt);
  const footerDate = publishedDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const content = payload.content ? decodeHtmlEntities(payload.content) : null;

  const descriptionParts: string[] = [];
  if (content) {
    descriptionParts.push(content);
  }
  descriptionParts.push(
    `Veuillez consulter notre site officiel pour plus d'informations.`,
    `▶ [Accéder au site officiel de **The Seven Deadly Sins: Origin**](${payload.url})`,
  );

  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setAuthor({ name: `${style.emoji} ${payload.category} · ${payload.lang.toUpperCase()}` })
    .setTitle(title)
    .setURL(payload.url)
    .setDescription(descriptionParts.join("\n\n"))
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
