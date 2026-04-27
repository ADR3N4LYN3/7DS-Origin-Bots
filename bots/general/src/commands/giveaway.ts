import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
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
  GIVEAWAY_EMOJI,
} from "../giveaways/scheduler.js";

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

// ── Embed ───────────────────────────────────────────────────────────

function buildGiveawayEmbed(g: Giveaway): EmbedBuilder {
  const endTs = Math.floor(g.endsAt / 1000);
  const desc = [
    `🥇 **1er :** ${g.prize1}`,
    `🥈 **2e :** ${g.prize2}`,
    `🥉 **3e :** ${g.prize3}`,
    "",
    `⏰ Termine <t:${endTs}:R>`,
    `👤 Hôte : <@${g.hostId}>`,
    "",
    `Réagis avec ${GIVEAWAY_EMOJI} pour participer !`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(desc)
    .setFooter({ text: "7DS Origin · Termine le" })
    .setTimestamp(g.endsAt);
}

// ── Command builder ────────────────────────────────────────────────

export function buildGiveawayCommand() {
  return new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Gérer les giveaways (admin)")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Lancer un giveaway 3 lots")
        .addStringOption((o) => o.setName("prize1").setDescription("1er lot 🥇").setRequired(true))
        .addStringOption((o) => o.setName("prize2").setDescription("2e lot 🥈").setRequired(true))
        .addStringOption((o) => o.setName("prize3").setDescription("3e lot 🥉").setRequired(true))
        .addStringOption((o) =>
          o.setName("duration").setDescription("Durée (ex: 30m, 2h, 1d, 7d)").setRequired(true),
        )
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Channel cible (par défaut : actuel)").setRequired(false),
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
  } else if (sub === "reroll") {
    await handleReroll(interaction, client);
  } else if (sub === "list") {
    await handleList(interaction);
  }
}

// ── Subcommand: start ──────────────────────────────────────────────

async function handleStart(interaction: ChatInputCommandInteraction) {
  const prize1 = interaction.options.getString("prize1", true);
  const prize2 = interaction.options.getString("prize2", true);
  const prize3 = interaction.options.getString("prize3", true);
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

  // Send placeholder to get messageId
  const placeholder: Giveaway = {
    messageId: "pending",
    channelId: targetChannel.id,
    guildId: interaction.guildId,
    hostId: interaction.user.id,
    prize1, prize2, prize3,
    endsAt,
    ended: false,
    winners: [],
  };

  try {
    const message = await targetChannel.send({ embeds: [buildGiveawayEmbed(placeholder)] });
    await message.react(GIVEAWAY_EMOJI);

    const giveaway: Giveaway = { ...placeholder, messageId: message.id };
    addGiveaway(giveaway);
    scheduleGiveaway(interaction.client, giveaway);

    await interaction.reply({
      content: `✅ Giveaway lancé dans <#${targetChannel.id}> ! ID: \`${message.id}\``,
      flags: 64,
    });
  } catch (err) {
    console.error("Failed to start giveaway:", err);
    await interaction.reply({ content: "❌ Erreur lors du lancement du giveaway.", flags: 64 });
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
    return `╸ <#${g.channelId}> — \`${g.messageId}\`\n  🥇 ${g.prize1} · 🥈 ${g.prize2} · 🥉 ${g.prize3}\n  ⏰ Termine <t:${ts}:R>`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle(`🎉 Giveaways en cours (${active.length})`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: "7DS Origin" });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
