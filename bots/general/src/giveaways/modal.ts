import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";
import {
  findEntry,
  findEntryByUid,
  findGiveaway,
  upsertEntry,
  type GiveawayEntry,
} from "./storage.js";
import { refreshGiveawayCard } from "./card.js";
import { I18N, langFromLocale, type Lang } from "./i18n.js";

export const MODAL_PREFIX = "gwm";
const FIELD_PSEUDO = "pseudo";
const FIELD_UID = "uid";

// Bornes reprises telles quelles dans les messages d'erreur (i18n.ts).
const PSEUDO_MIN = 2;
const PSEUDO_MAX = 32;
// UID Lootbar : `U` + 10 chiffres (ex. U1062182404). La plage 6-14 laisse de
// la marge sur la longueur du compteur sans accepter n'importe quoi.
const UID_MIN = 7;
const UID_MAX = 15;
const UID_RE = /^U\d{6,14}$/;

// Espaces retirés, `u` minuscule accepté, et `U` reposé si le membre a collé
// les chiffres seuls — les trois ratés de copier-coller qu'on voit passer.
function normalizeUid(raw: string): string {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  return /^\d+$/.test(cleaned) ? `U${cleaned}` : cleaned;
}

// D'où le modal a été ouvert : depuis la carte publique, ou depuis le récap
// éphémère (« Modifier mes infos ») — dans ce cas la réponse remplace ce récap.
type ModalOrigin = "card" | "panel";

// Modal d'inscription. `existing` pré-remplit les champs quand le membre modifie ses infos.
export function buildEntryModal(
  messageId: string,
  lang: Lang,
  existing?: GiveawayEntry,
  origin: ModalOrigin = "card",
): ModalBuilder {
  const t = I18N[lang];

  // `value` n'est posé que s'il est non vide : une chaîne vide serait rejetée
  // par l'API face au min_length du champ.
  const field = (
    customId: string,
    placeholder: string,
    min: number,
    max: number,
    value: string | undefined,
  ) => {
    const input = new TextInputBuilder()
      .setCustomId(customId)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(placeholder)
      .setMinLength(min)
      .setMaxLength(max)
      .setRequired(true);
    if (value) input.setValue(value);
    return input;
  };

  return new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}:${messageId}:${origin}`)
    .setTitle(t.modalTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(t.pseudoLabel)
        .setDescription(t.pseudoDesc)
        .setTextInputComponent(
          field(FIELD_PSEUDO, t.pseudoPlaceholder, PSEUDO_MIN, PSEUDO_MAX, existing?.pseudo),
        ),
      new LabelBuilder()
        .setLabel(t.uidLabel)
        .setDescription(t.uidDesc)
        .setTextInputComponent(
          field(FIELD_UID, t.uidPlaceholder, UID_MIN, UID_MAX, existing?.uid),
        ),
    );
}

export async function handleGiveawayModal(interaction: ModalSubmitInteraction) {
  const parts = interaction.customId.split(":");
  if (parts[0] !== MODAL_PREFIX) return;

  const messageId = parts[1];
  const t = I18N[langFromLocale(interaction.locale)];

  // Refus : message à part, le récap éphémère et ses boutons restent en place
  // pour que le membre puisse retenter sans repasser par la carte.
  const fail = (content: string) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  // Succès : si le modal vient du récap éphémère, on remplace ce récap.
  const fromPanel = parts[2] === "panel" && interaction.isFromMessage();
  const succeed = (content: string) =>
    fromPanel
      ? interaction.update({ content, components: [] })
      : interaction.reply({ content, flags: MessageFlags.Ephemeral });

  const g = findGiveaway(messageId);
  if (!g) {
    await fail(t.notFound);
    return;
  }
  if (g.ended) {
    await fail(t.isEnded);
    return;
  }

  const pseudo = interaction.fields.getTextInputValue(FIELD_PSEUDO).trim();
  const uid = normalizeUid(interaction.fields.getTextInputValue(FIELD_UID));

  if (pseudo.length < PSEUDO_MIN || pseudo.length > PSEUDO_MAX) {
    await fail(t.badPseudo);
    return;
  }
  if (uid.length < UID_MIN || uid.length > UID_MAX || !UID_RE.test(uid)) {
    await fail(t.badUid);
    return;
  }
  if (findEntryByUid(g, uid, interaction.user.id)) {
    await fail(t.uidTaken);
    return;
  }

  const wasComplete = Boolean(findEntry(g, interaction.user.id)?.uid);
  upsertEntry(messageId, interaction.user.id, pseudo, uid);

  await succeed([
    wasComplete ? t.updated : t.joined,
    `**${t.yourPseudo}** \`${pseudo}\``,
    `**${t.yourUid}** \`${uid}\``,
  ].join("\n"));

  await refreshGiveawayCard(interaction.client, messageId);
}

// Récap + actions proposées au membre déjà inscrit (réponse éphémère au clic « Participer »).
export function buildEntrySummary(messageId: string, lang: Lang, entry: GiveawayEntry) {
  const t = I18N[lang];

  const content = [
    t.alreadyIn,
    `**${t.yourPseudo}** \`${entry.pseudo}\``,
    `**${t.yourUid}** \`${entry.uid}\``,
  ].join("\n");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:${messageId}:edit`)
      .setLabel(t.btnEdit)
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`gw:${messageId}:leave`)
      .setLabel(t.btnLeave)
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Danger),
  );

  return { content, components: [row] };
}
