import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  type TextChannel,
} from "discord.js";
import { hasAdminRole, splitContent } from "../utils.js";

export function buildRepublishCommand() {
  return new SlashCommandBuilder()
    .setName("republish")
    .setDescription("Republier un message existant dans un autre channel (admin)")
    .addStringOption((opt) =>
      opt.setName("message_id").setDescription("ID du message à reposter").setRequired(true),
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel cible").setRequired(true),
    )
    .addRoleOption((opt) =>
      opt.setName("ping").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
    )
    .addChannelOption((opt) =>
      opt.setName("source").setDescription("Channel où se trouve le message (par défaut : actuel)").setRequired(false),
    );
}

export async function handleRepublishCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
) {
  // Ack < 3 s obligatoire : fetch + N send + crosspost dépassent la fenêtre du token
  // d'interaction → "L'application ne répond plus" côté Discord, 10062 côté bot.
  await interaction.deferReply({ flags: 64 });

  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.editReply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande." });
    return;
  }

  const messageId = interaction.options.getString("message_id", true);
  const targetChannel = interaction.options.getChannel("channel", true) as TextChannel;
  const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.editReply({ content: "❌ Message introuvable dans ce channel." });
    return;
  }

  try {
    const pingRole = interaction.options.getRole("ping");
    const mention = pingRole
      ? pingRole.id === interaction.guildId ? "@everyone" : `<@&${pingRole.id}>`
      : "";
    const fullContent = [mention, original.content].filter(Boolean).join("\n");
    const chunks = splitContent(fullContent);

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

      const sent = await targetChannel.send(payload);

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

    const suffix = published > 0 ? " et publié aux serveurs abonnés" : "";
    await interaction.editReply({ content: `✅ Message reposté dans <#${targetChannel.id}>${suffix}.` });
  } catch (err) {
    console.error("Failed to repost message:", err);
    await interaction.editReply({ content: "❌ Erreur lors du repost." });
  }
}
