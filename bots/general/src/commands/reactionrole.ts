import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "..", "data", "reactionroles.json");

export interface ReactionRoleMapping {
  messageId: string;
  channelId: string;
  mappings: Record<string, string>; // emoji → roleId
}

export function loadReactionRoles(): ReactionRoleMapping[] {
  if (!existsSync(DATA_PATH)) return [];
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
}

function saveReactionRoles(data: ReactionRoleMapping[]) {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function splitContent(text: string, max = 2000): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= max) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", max);
    if (splitAt <= 0) splitAt = max;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, "");
  }

  return chunks;
}

export function buildReactionRoleCommand() {
  return new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Créer un message avec réactions pour attribuer des rôles (admin)")
    .addStringOption((opt) =>
      opt
        .setName("message_id")
        .setDescription("ID du message à reposter (optionnel, sinon crée un embed)")
        .setRequired(false),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel cible (requis si message_id)")
        .setRequired(false),
    );
}

export async function handleReactionRoleCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  const roles = interaction.member?.roles;
  const hasAdmin =
    roles instanceof GuildMemberRoleManager
      ? roles.cache.has(adminRoleId)
      : Array.isArray(roles) && roles.includes(adminRoleId);

  if (!hasAdmin) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const messageId = interaction.options.getString("message_id");
  const targetChannel = interaction.options.getChannel("channel") as TextChannel | null;

  // Mode repost : message_id fourni
  if (messageId) {
    if (!targetChannel) {
      await interaction.reply({ content: "❌ Spécifie un channel cible avec l'option `channel`.", flags: 64 });
      return;
    }

    const sourceChannel = interaction.channel as TextChannel;

    let original;
    try {
      original = await sourceChannel.messages.fetch(messageId);
    } catch {
      await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
      return;
    }

    const modalId = `reactionrole_repost_${interaction.id}`;
    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle("🎭 Reaction Roles — Mappings");

    const mappingsInput = new TextInputBuilder()
      .setCustomId("mappings")
      .setLabel("Mappings (emoji roleId par ligne)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000)
      .setPlaceholder("🔧 123456789012345678\n🌐 987654321098765432");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(mappingsInput),
    );

    await interaction.showModal(modal);

    let submit: ModalSubmitInteraction;
    try {
      submit = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === modalId,
        time: 300_000,
      });
    } catch {
      return;
    }

    const mappings = parseMappings(submit.fields.getTextInputValue("mappings"));

    if (Object.keys(mappings).length === 0) {
      await submit.reply({ content: "❌ Aucun mapping valide trouvé.", flags: 64 });
      return;
    }

    try {
      const chunks = splitContent(original.content || "");
      let lastMsg;

      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const payload: { content?: string; embeds?: any[]; files?: any[] } = {};

        if (chunks[i]) payload.content = chunks[i];

        if (isLast) {
          if (original.embeds.length > 0) payload.embeds = original.embeds;
          if (original.attachments.size > 0) {
            payload.files = original.attachments.map((a) => ({
              attachment: a.url,
              name: a.name ?? undefined,
            }));
          }
        }

        lastMsg = await targetChannel.send(payload);
      }

      if (lastMsg) {
        for (const emoji of Object.keys(mappings)) {
          await lastMsg.react(emoji);
        }

        const data = loadReactionRoles();
        data.push({ messageId: lastMsg.id, channelId: targetChannel.id, mappings });
        saveReactionRoles(data);
      }

      await submit.reply({ content: `✅ Reaction roles configurés dans <#${targetChannel.id}>.`, flags: 64 });
    } catch (err) {
      console.error("Failed to setup reaction roles:", err);
      await submit.reply({ content: "❌ Erreur lors de la configuration.", flags: 64 });
    }

    return;
  }

  // Mode embed : pas de message_id
  const modalId = `reactionrole_modal_${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("🎭 Reaction Roles");

  const titreInput = new TextInputBuilder()
    .setCustomId("titre")
    .setLabel("Titre de l'embed")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description (Markdown supporté)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  const mappingsInput = new TextInputBuilder()
    .setCustomId("mappings")
    .setLabel("Mappings (emoji roleId par ligne)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder("🎮 123456789012345678\n🎨 987654321098765432");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(mappingsInput),
  );

  await interaction.showModal(modal);

  let submit: ModalSubmitInteraction;
  try {
    submit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === modalId,
      time: 300_000,
    });
  } catch {
    return;
  }

  const titre = submit.fields.getTextInputValue("titre");
  const description = submit.fields.getTextInputValue("description");
  const mappings = parseMappings(submit.fields.getTextInputValue("mappings"));

  if (Object.keys(mappings).length === 0) {
    await submit.reply({ content: "❌ Aucun mapping valide trouvé.", flags: 64 });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setDescription(description)
    .setFooter({ text: "7DS Origin" });

  const channel = interaction.channel as TextChannel;

  try {
    const msg = await channel.send({ content: `# 🎭 ${titre}`, embeds: [embed] });

    for (const emoji of Object.keys(mappings)) {
      await msg.react(emoji);
    }

    const data = loadReactionRoles();
    data.push({ messageId: msg.id, channelId: channel.id, mappings });
    saveReactionRoles(data);

    await submit.reply({ content: "✅ Reaction roles configurés.", flags: 64 });
  } catch (err) {
    console.error("Failed to setup reaction roles:", err);
    await submit.reply({ content: "❌ Erreur lors de la configuration des reaction roles.", flags: 64 });
  }
}

function parseMappings(raw: string): Record<string, string> {
  const mappings: Record<string, string> = {};
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const emoji = parts[0];
    const roleId = parts[parts.length - 1];
    mappings[emoji] = roleId;
  }

  return mappings;
}
