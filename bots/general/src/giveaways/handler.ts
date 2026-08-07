import { type ButtonInteraction, MessageFlags } from "discord.js";
import { findEntry, findGiveaway, removeParticipant } from "./storage.js";
import { buildGiveawayContainer } from "./render.js";
import { buildEntryModal, buildEntrySummary } from "./modal.js";
import { refreshGiveawayCard } from "./card.js";
import { I18N, langFromLocale, type Lang } from "./i18n.js";

const VALID_LANGS: Lang[] = ["fr", "en", "es", "de"];

export async function handleGiveawayButton(interaction: ButtonInteraction) {
  // customId format: gw:<messageId>:<action>[:<lang>]
  const parts = interaction.customId.split(":");
  if (parts[0] !== "gw") return;

  const messageId = parts[1];
  const action = parts[2];
  const lang = langFromLocale(interaction.locale);
  const t = I18N[lang];
  const g = findGiveaway(messageId);

  if (!g) {
    await interaction.reply({ content: t.notFound, flags: MessageFlags.Ephemeral });
    return;
  }

  // Aperçu traduit (éphémère, sans boutons ni bannière)
  if (action === "lang") {
    const previewLang = parts[3] as Lang;
    if (!VALID_LANGS.includes(previewLang)) return;
    await interaction.reply({
      components: [buildGiveawayContainer(g, { lang: previewLang, preview: true })],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (action !== "join" && action !== "edit" && action !== "leave") return;

  if (g.ended) {
    await interaction.reply({ content: t.isEnded, flags: MessageFlags.Ephemeral });
    return;
  }

  const entry = findEntry(g, interaction.user.id);

  // « Quitter » n'existe que sur le récap éphémère → on remplace ce récap.
  if (action === "leave") {
    removeParticipant(messageId, interaction.user.id);
    await interaction.update({ content: t.left, components: [] });
    await refreshGiveawayCard(interaction.client, messageId);
    return;
  }

  // « Modifier mes infos », ou 1ʳᵉ inscription : le modal fait foi.
  // Les participations d'avant le modal n'ont pas d'UID → on les traite comme neuves.
  if (action === "edit" || !entry?.uid) {
    await interaction.showModal(buildEntryModal(messageId, lang, entry, action === "edit" ? "panel" : "card"));
    return;
  }

  // Déjà inscrit et complet : récap + boutons Modifier / Quitter.
  await interaction.reply({
    ...buildEntrySummary(messageId, lang, entry),
    flags: MessageFlags.Ephemeral,
  });
}
