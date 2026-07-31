import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  type TextChannel,
} from "discord.js";
import { hasAdminRole, splitContent } from "../utils.js";

export function buildNewsCommand() {
  return new SlashCommandBuilder()
    .setName("news")
    .setDescription("Publier une annonce dans le channel annonces (admin)")
    .addSubcommand((sub) =>
      sub
        .setName("update")
        .setDescription("Publier une mise à jour")
        .addStringOption((opt) =>
          opt.setName("message_id").setDescription("ID du message à publier").setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("ping").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
        )
        .addChannelOption((opt) =>
          opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("patchnote")
        .setDescription("Publier un patch note")
        .addStringOption((opt) =>
          opt.setName("message_id").setDescription("ID du message à publier").setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("ping").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
        )
        .addChannelOption((opt) =>
          opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leak")
        .setDescription("Publier un leak")
        .addStringOption((opt) =>
          opt.setName("message_id").setDescription("ID du message à publier").setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("ping").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
        )
        .addChannelOption((opt) =>
          opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
        ),
    );
}

export async function handleNewsCommand(
  interaction: ChatInputCommandInteraction,
  newsChannelId: string,
  leaksChannelId: string,
  adminRoleId: string,
) {
  // Ack < 3 s obligatoire : fetch + N send + crosspost dépassent la fenêtre du token
  // d'interaction → "L'application ne répond plus" côté Discord, 10062 côté bot.
  await interaction.deferReply({ flags: 64 });

  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.editReply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande." });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const messageId = interaction.options.getString("message_id", true);
  const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.editReply({ content: "❌ Message introuvable dans ce channel." });
    return;
  }

  const targetChannelId = subcommand === "leak" ? leaksChannelId : newsChannelId;
  const channel = (await interaction.client.channels.fetch(targetChannelId)) as TextChannel | null;

  if (!channel) {
    await interaction.editReply({ content: "❌ Channel introuvable." });
    return;
  }

  const pingRole = interaction.options.getRole("ping");
  const mention = pingRole
    ? pingRole.id === interaction.guildId ? "@everyone" : `<@&${pingRole.id}>`
    : "";
  const fullContent = [mention, original.content].filter(Boolean).join("\n");
  const chunks = splitContent(fullContent);

  const SUBCOMMAND_LABELS: Record<string, string> = {
    update: "Mise à jour",
    patchnote: "Patch Note",
    leak: "Leak",
  };

  try {
    let published = 0;
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

      const sent = await channel.send(payload);

      // Salon d'annonces → « Publier » vers les serveurs abonnés (un send() ne le fait pas).
      if (sent.channel.type === ChannelType.GuildAnnouncement) {
        try {
          await sent.crosspost();
          published++;
        } catch (err) {
          console.error("Failed to crosspost message:", err);
        }
      }
    }

    const suffix = published > 0 ? " et publiée aux serveurs abonnés" : "";
    await interaction.editReply({
      content: `✅ ${SUBCOMMAND_LABELS[subcommand]} publiée dans <#${targetChannelId}>${suffix}.`,
    });
  } catch (err) {
    console.error("Failed to send news:", err);
    await interaction.editReply({ content: "❌ Erreur lors de l'envoi du message." });
  }
}
