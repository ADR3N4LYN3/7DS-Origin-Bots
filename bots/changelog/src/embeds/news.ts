import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface NewsPayload {
  id: number;
  title: string;
  category: string;
  lang: string;
  url: string;
  publishedAt: string;
}

const CATEGORY_STYLE: Record<string, { emoji: string; color: number }> = {
  Updates:         { emoji: "🔧", color: 0x56a8f5 },
  Annonce:         { emoji: "📢", color: 0xf5a623 },
  "Note des devs": { emoji: "💬", color: 0x8b5cf6 },
  News:            { emoji: "📰", color: 0x10b981 },
  Événement:       { emoji: "🎉", color: 0xec4899 },
};

const DEFAULT_STYLE = { emoji: "📄", color: 0x95a5a6 };

export function buildNewsEmbed(payload: NewsPayload) {
  const style = CATEGORY_STYLE[payload.category] ?? DEFAULT_STYLE;

  const publishedDate = new Date(payload.publishedAt);
  const footerDate = publishedDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const separator = "──────────────────────────────";

  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(`${style.emoji} ${payload.title}`)
    .setDescription(
      [
        separator,
        `Catégorie : ${payload.category}    Langue : ${payload.lang.toUpperCase()}`,
        separator,
        `🔗 [Lire l'article](${payload.url})`,
        separator,
      ].join("\n"),
    )
    .setFooter({ text: `7DS Origin • ${footerDate}` })
    .setTimestamp(publishedDate);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Lire l'article")
      .setURL(payload.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );

  return { embed, row };
}
