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
// Champ Lootbar : UID (`U1062182404`) OU pseudo, au choix du membre — et
// facultatif : c'est Lootbar qui identifie le gagnant à la livraison.
const LOOTBAR_MIN = 2;
const LOOTBAR_MAX = 32;
const UID_DIGITS_ONLY = /^\d{6,14}$/;

// Un UID collé sans son `U` reste un UID : on le repose. Tout le reste est un
// pseudo, laissé tel quel.
function normalizeLootbar(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return UID_DIGITS_ONLY.test(trimmed) ? `U${trimmed}` : trimmed;
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
    required: boolean,
  ) => {
    const input = new TextInputBuilder()
      .setCustomId(customId)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(placeholder)
      .setMinLength(min)
      .setMaxLength(max)
      .setRequired(required);
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
          field(FIELD_PSEUDO, t.pseudoPlaceholder, PSEUDO_MIN, PSEUDO_MAX, existing?.pseudo, true),
        ),
      new LabelBuilder()
        .setLabel(t.uidLabel)
        .setDescription(t.uidDesc)
        .setTextInputComponent(
          field(FIELD_UID, t.uidPlaceholder, LOOTBAR_MIN, LOOTBAR_MAX, existing?.uid, false),
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
  const uid = normalizeLootbar(interaction.fields.getTextInputValue(FIELD_UID));

  if (pseudo.length < PSEUDO_MIN || pseudo.length > PSEUDO_MAX) {
    await fail(t.badPseudo);
    return;
  }
  // Champ facultatif : vide passe. Renseigné, il doit rester exploitable.
  if (uid && (uid.length < LOOTBAR_MIN || uid.length > LOOTBAR_MAX)) {
    await fail(t.badUid);
    return;
  }
  if (uid && findEntryByUid(g, uid, interaction.user.id)) {
    await fail(t.uidTaken);
    return;
  }

  const wasComplete = Boolean(findEntry(g, interaction.user.id)?.pseudo);
  upsertEntry(messageId, interaction.user.id, pseudo, uid);

  await succeed([
    wasComplete ? t.updated : t.joined,
    `**${t.yourPseudo}** \`${pseudo}\``,
    `**${t.yourUid}** ${uid ? `\`${uid}\`` : t.notProvided}`,
  ].join("\n"));

  await refreshGiveawayCard(interaction.client, messageId);
}

// Récap + actions proposées au membre déjà inscrit (réponse éphémère au clic « Participer »).
export function buildEntrySummary(messageId: string, lang: Lang, entry: GiveawayEntry) {
  const t = I18N[lang];

  const content = [
    t.alreadyIn,
    `**${t.yourPseudo}** \`${entry.pseudo}\``,
    `**${t.yourUid}** ${entry.uid ? `\`${entry.uid}\`` : t.notProvided}`,
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
