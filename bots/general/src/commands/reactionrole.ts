import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  EmbedBuilder,
  ComponentType,
  type TextChannel,
} from "discord.js";
import { hasAdminRole, splitContent } from "../utils.js";

// ── Button helpers ──────────────────────────────────────────────────

function parseEmoji(raw: string): { name: string; id?: string; animated?: boolean } | string {
  // Custom emoji: <:name:id> or <a:name:id>
  const match = raw.match(/^<(a)?:(\w+):(\d+)>$/);
  if (match) {
    return { animated: !!match[1], name: match[2], id: match[3] };
  }
  // Unicode emoji
  return raw;
}

function buildRoleButtons(
  mappings: { emoji: string; roleId: string; roleName: string }[],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  for (const { emoji, roleId, roleName } of mappings) {
    if (currentRow.components.length >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }

    const btn = new ButtonBuilder()
      .setCustomId(`rr:${roleId}`)
      .setLabel(roleName)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(parseEmoji(emoji));

    currentRow.addComponents(btn);
  }

  if (currentRow.components.length > 0) rows.push(currentRow);
  return rows;
}

// ── Button interaction handler ──────────────────────────────────────

export async function handleRoleButtonClick(interaction: ButtonInteraction) {
  const roleId = interaction.customId.slice(3); // strip "rr:"

  const member = interaction.guild?.members.cache.get(interaction.user.id)
    ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: "❌ Erreur : membre introuvable.", flags: 64 });
    return;
  }

  const role = interaction.guild?.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({ content: "❌ Erreur : rôle introuvable.", flags: 64 });
    return;
  }

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: `❌ Rôle **${role.name}** retiré.`, flags: 64 });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ content: `✅ Rôle **${role.name}** ajouté !`, flags: 64 });
    }
    setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
  } catch (err) {
    console.error("Failed to toggle role:", err);
    await interaction.reply({ content: "❌ Impossible de modifier ce rôle.", flags: 64 });
  }
}

// ── Command ─────────────────────────────────────────────────────────

export function buildReactionRoleCommand() {
  return new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Créer un message avec boutons pour attribuer des rôles (admin)")
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID du message à reposter (optionnel, sinon crée un embed)").setRequired(false),
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible (requis si message_id)").setRequired(false),
    )
    .addChannelOption((opt) =>
      opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
    );
}

export async function handleReactionRoleCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const messageId = interaction.options.getString("message_id");
  const targetChannel = interaction.options.getChannel("channel") as TextChannel | null;

  // ── Mode repost ──
  if (messageId) {
    if (!targetChannel) {
      await interaction.reply({ content: "❌ Spécifie un channel cible avec l'option `channel`.", flags: 64 });
      return;
    }

    const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

    let original;
    try {
      original = await sourceChannel.messages.fetch(messageId);
    } catch {
      await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
      return;
    }

    const mappings = await collectMappings(interaction, `reactionrole_repost_${interaction.id}`);
    if (!mappings) return;

    try {
      const chunks = splitContent(original.content || "");
      let lastMsg;

      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const payload: { content?: string; embeds?: any[]; files?: any[]; components?: any[] } = {};

        if (chunks[i]) payload.content = chunks[i];

        if (isLast) {
          if (original.embeds.length > 0) payload.embeds = original.embeds;
          if (original.attachments.size > 0) {
            payload.files = original.attachments.map((a) => ({
              attachment: a.url,
              name: a.name ?? undefined,
            }));
          }
          payload.components = buildRoleButtons(mappings);
        }

        lastMsg = await targetChannel.send(payload);
      }

      await interaction.followUp({ content: `✅ Reaction roles configurés dans <#${targetChannel.id}>.`, flags: 64 });
    } catch (err) {
      console.error("Failed to setup reaction roles:", err);
      await interaction.followUp({ content: "❌ Erreur lors de la configuration.", flags: 64 });
    }

    return;
  }

  // ── Mode embed ──
  const mappings = await collectMappings(interaction, `reactionrole_modal_${interaction.id}`, true);
  if (!mappings) return;

  const channel = interaction.channel as TextChannel;

  try {
    const { titre, description } = mappings as any;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(description)
      .setFooter({ text: "7DS Origin" });

    await channel.send({
      content: `# 🎭 ${titre}`,
      embeds: [embed],
      components: buildRoleButtons(mappings.items),
    });

    await interaction.followUp({ content: "✅ Reaction roles configurés.", flags: 64 });
  } catch (err) {
    console.error("Failed to setup reaction roles:", err);
    await interaction.followUp({ content: "❌ Erreur lors de la configuration des reaction roles.", flags: 64 });
  }
}

// ── Modal & mapping parser ──────────────────────────────────────────

async function collectMappings(
  interaction: ChatInputCommandInteraction,
  modalId: string,
  withEmbed = false,
): Promise<any | null> {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("🎭 Reaction Roles — Mappings");

  if (withEmbed) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("titre")
          .setLabel("Titre de l'embed")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description (Markdown supporté)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000),
      ),
    );
  }

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("mappings")
        .setLabel("Mappings (emoji roleId par ligne)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000)
        .setPlaceholder("🎮 123456789012345678\n🎨 987654321098765432"),
    ),
  );

  await interaction.showModal(modal);

  let submit: ModalSubmitInteraction;
  try {
    submit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === modalId,
      time: 300_000,
    });
  } catch {
    return null;
  }

  const raw = submit.fields.getTextInputValue("mappings");
  const items = parseMappings(raw, interaction);

  if (items.length === 0) {
    await submit.reply({ content: "❌ Aucun mapping valide trouvé.", flags: 64 });
    return null;
  }

  await submit.deferReply({ flags: 64 });

  if (withEmbed) {
    return {
      titre: submit.fields.getTextInputValue("titre"),
      description: submit.fields.getTextInputValue("description"),
      items,
    };
  }

  return items;
}

function parseMappings(
  raw: string,
  interaction: ChatInputCommandInteraction,
): { emoji: string; roleId: string; roleName: string }[] {
  const results: { emoji: string; roleId: string; roleName: string }[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const emoji = parts[0];
    const roleId = parts[parts.length - 1];

    const role = interaction.guild?.roles.cache.get(roleId);
    results.push({
      emoji,
      roleId,
      roleName: role?.name ?? roleId,
    });
  }

  return results;
}
