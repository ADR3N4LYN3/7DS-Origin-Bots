import {
  AttachmentBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  type TextChannel,
  type Client,
} from "discord.js";
import { hasAdminRole } from "../utils.js";
import {
  addGiveaway,
  findGiveaway,
  listActiveGiveaways,
  type Giveaway,
} from "../giveaways/storage.js";
import {
  scheduleGiveaway,
  endGiveaway,
  rerollGiveaway,
} from "../giveaways/scheduler.js";
import { buildGiveawayContainer } from "../giveaways/render.js";
import { GIVEAWAY_PING_ROLE_ID } from "../giveaways/config.js";
import { bannerFile, BANNER_ATTACHMENT_URL } from "../assets.js";

// ── Duration parser ────────────────────────────────────────────────

const DURATION_RE = /^(\d+)\s*(s|m|h|d|w)$/i;
const DURATION_MULT: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

function parseDuration(input: string): number | null {
  const match = input.trim().match(DURATION_RE);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = value * DURATION_MULT[unit];
  if (ms < 30_000 || ms > 30 * 86_400_000) return null; // 30s min, 30d max
  return ms;
}
// ── Command builder ────────────────────────────────────────────────

export function buildGiveawayCommand() {
  return new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Gérer les giveaways (admin)")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Lancer un giveaway (1 à 3 lots)")
        .addStringOption((o) => o.setName("prize1").setDescription("1er lot 🥇").setRequired(true))
        .addStringOption((o) =>
          o.setName("duration").setDescription("Durée (ex: 30m, 2h, 1d, 7d)").setRequired(true),
        )
        .addStringOption((o) => o.setName("prize2").setDescription("2e lot 🥈 (optionnel)").setRequired(false))
        .addStringOption((o) => o.setName("prize3").setDescription("3e lot 🥉 (optionnel)").setRequired(false))
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
        )
        .addStringOption((o) =>
          o.setName("title").setDescription("Titre personnalisé (par défaut : 🎉 Giveaway · 7DS Origin)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Terminer un giveaway en avance")
        .addStringOption((o) =>
          o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Tirer un nouveau gagnant pour un lot")
        .addStringOption((o) =>
          o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("tier")
            .setDescription("Quel lot rerolll (1, 2 ou 3)")
            .setRequired(false)
            .addChoices(
              { name: "🥇 1er lot", value: 1 },
              { name: "🥈 2e lot", value: 2 },
              { name: "🥉 3e lot", value: 3 },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lister les giveaways en cours"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("participants")
        .setDescription("Voir la liste des participants d'un giveaway")
        .addStringOption((o) =>
          o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true),
        ),
    );
}

// ── Handler ────────────────────────────────────────────────────────

export async function handleGiveawayCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
  client: Client,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "start") {
    await handleStart(interaction);
  } else if (sub === "end") {
    await handleEnd(interaction, client);
  } else if (sub === "participants") {
    await handleParticipants(interaction);
  } else if (sub === "reroll") {
    await handleReroll(interaction, client);
  } else if (sub === "list") {
    await handleList(interaction);
  }
}

// ── Subcommand: start ──────────────────────────────────────────────

async function handleStart(interaction: ChatInputCommandInteraction) {
  const prize1 = interaction.options.getString("prize1", true);
  const prize2 = interaction.options.getString("prize2");
  const prize3 = interaction.options.getString("prize3");
  const durationStr = interaction.options.getString("duration", true);
  const targetChannel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  const durationMs = parseDuration(durationStr);
  if (durationMs === null) {
    await interaction.reply({
      content: "❌ Durée invalide. Format : `30s`, `5m`, `2h`, `1d`, `7d` (min 30s, max 30j).",
      flags: 64,
    });
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Cette commande doit être utilisée sur un serveur.", flags: 64 });
    return;
  }

  const endsAt = Date.now() + durationMs;
  const title = interaction.options.getString("title");

  const placeholder: Giveaway = {
    messageId: "pending",
    channelId: targetChannel.id,
    guildId: interaction.guildId,
    hostId: interaction.user.id,
    prize1, prize2, prize3,
    endsAt,
    ended: false,
    entries: [],
    winners: [],
    title: title ?? null,
  };

  await interaction.deferReply({ flags: 64 });

  const iconUrl = interaction.guild?.iconURL({ size: 256 })
    ?? interaction.client.user?.displayAvatarURL({ size: 256 });
  const banner = bannerFile();
  const bannerUrl = banner ? BANNER_ATTACHMENT_URL : undefined;
  const files = banner ? [banner] : [];

  try {
    // Ping du rôle Notif Giveaway (message séparé, une seule fois, au-dessus de la carte).
    if (GIVEAWAY_PING_ROLE_ID) {
      await targetChannel.send({
        content: `🎉 <@&${GIVEAWAY_PING_ROLE_ID}> — Nouveau giveaway ! / New giveaway!`,
        allowedMentions: { roles: [GIVEAWAY_PING_ROLE_ID] },
      }).catch(() => {});
    }

    // 1ᵉʳ envoi (bouton désactivé) pour obtenir le messageId, puis édition avec le vrai bouton.
    const message = await targetChannel.send({
      components: [buildGiveawayContainer(placeholder, { iconUrl, bannerUrl, pending: true })],
      files,
      flags: MessageFlags.IsComponentsV2,
    });

    const giveaway: Giveaway = { ...placeholder, messageId: message.id };
    await message.edit({
      components: [buildGiveawayContainer(giveaway, { iconUrl, bannerUrl })],
      files,
      flags: MessageFlags.IsComponentsV2,
    });

    addGiveaway(giveaway);
    scheduleGiveaway(interaction.client, giveaway);

    await interaction.editReply({
      content: `✅ Giveaway lancé dans <#${targetChannel.id}> ! ID: \`${message.id}\``,
    });
  } catch (err) {
    console.error("Failed to start giveaway:", err);
    await interaction.editReply({ content: "❌ Erreur lors du lancement du giveaway." });
  }
}

// ── Subcommand: end ────────────────────────────────────────────────

async function handleEnd(interaction: ChatInputCommandInteraction, client: Client) {
  const messageId = interaction.options.getString("message_id", true);
  const g = findGiveaway(messageId);

  if (!g) {
    await interaction.reply({ content: "❌ Giveaway introuvable.", flags: 64 });
    return;
  }

  if (g.ended) {
    await interaction.reply({ content: "❌ Ce giveaway est déjà terminé.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });
  await endGiveaway(client, messageId);
  await interaction.editReply({ content: "✅ Giveaway terminé." });
}

// ── Subcommand: reroll ─────────────────────────────────────────────

async function handleReroll(interaction: ChatInputCommandInteraction, client: Client) {
  const messageId = interaction.options.getString("message_id", true);
  const tier = interaction.options.getInteger("tier") as 1 | 2 | 3 | null;

  await interaction.deferReply({ flags: 64 });
  const result = await rerollGiveaway(client, messageId, tier ?? undefined);

  if (!result.success) {
    await interaction.editReply({ content: `❌ ${result.error}` });
    return;
  }

  await interaction.editReply({
    content: `✅ Reroll effectué pour le lot ${result.tier} — nouveau gagnant : <@${result.newWinner}>`,
  });
}

// ── Subcommand: list ───────────────────────────────────────────────

async function handleList(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Commande serveur uniquement.", flags: 64 });
    return;
  }

  const active = listActiveGiveaways(interaction.guildId);

  if (active.length === 0) {
    await interaction.reply({ content: "Aucun giveaway en cours.", flags: 64 });
    return;
  }

  const lines = active.map((g) => {
    const ts = Math.floor(g.endsAt / 1000);
    const prizeStr = [
      `🥇 ${g.prize1}`,
      g.prize2 ? `🥈 ${g.prize2}` : null,
      g.prize3 ? `🥉 ${g.prize3}` : null,
    ].filter(Boolean).join(" · ");
    return `╸ <#${g.channelId}> — \`${g.messageId}\`\n  ${prizeStr}\n  ⏰ Termine <t:${ts}:R>`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle(`🎉 Giveaways en cours (${active.length})`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: "7DS Origin" });

  await interaction.reply({ embeds: [embed], flags: 64 });
}

// ── Subcommand: participants ───────────────────────────────────────

async function handleParticipants(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString("message_id", true);
  const g = findGiveaway(messageId);

  if (!g) {
    await interaction.reply({ content: "❌ Giveaway introuvable.", flags: 64 });
    return;
  }

  if (g.entries.length === 0) {
    await interaction.reply({ content: "Aucun participant pour le moment.", flags: 64 });
    return;
  }

  // Aperçu tronqué à la limite de 4096 caractères de description d'embed ;
  // la liste complète part en pièce jointe CSV (réponse éphémère, admin only).
  const lines: string[] = [];
  let budget = 3900;
  let shown = 0;
  for (const e of g.entries) {
    const line = `╸ <@${e.userId}> · \`${e.pseudo || "—"}\` · Lootbar \`${e.uid || "—"}\``;
    if (line.length + 1 > budget) break;
    budget -= line.length + 1;
    lines.push(line);
    shown++;
  }
  if (shown < g.entries.length) lines.push(`\n*…et ${g.entries.length - shown} autres — voir le CSV joint*`);

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle(`🎟️ Participants (${g.entries.length})`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Giveaway ID: ${messageId}` });

  await interaction.reply({ embeds: [embed], files: [participantsCsv(g)], flags: 64 });
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// Liste complète exploitable pour la livraison des lots.
function participantsCsv(g: Giveaway): AttachmentBuilder {
  const rows = [
    ["pseudo_en_jeu", "lootbar", "discord_id", "inscrit_le"].join(","),
    ...g.entries.map((e) =>
      [
        csvCell(e.pseudo),
        csvCell(e.uid),
        csvCell(e.userId),
        csvCell(e.joinedAt ? new Date(e.joinedAt).toISOString() : ""),
      ].join(","),
    ),
  ];
  return new AttachmentBuilder(Buffer.from(`﻿${rows.join("\n")}`, "utf-8"), {
    name: `participants-${g.messageId}.csv`,
  });
}
