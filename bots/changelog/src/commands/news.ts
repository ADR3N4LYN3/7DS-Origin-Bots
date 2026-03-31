import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  type TextChannel,
} from "discord.js";

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

export function buildNewsCommand() {
  return new SlashCommandBuilder()
    .setName("news")
    .setDescription("Publier une annonce dans le channel annonces")
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
        .setDescription("Publier un leak (admin uniquement)")
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
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "leak") {
    const roles = interaction.member?.roles;
    const hasAdmin =
      roles instanceof GuildMemberRoleManager
        ? roles.cache.has(adminRoleId)
        : Array.isArray(roles) && roles.includes(adminRoleId);

    if (!hasAdmin) {
      await interaction.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande.", flags: 64 });
      return;
    }
  }

  const messageId = interaction.options.getString("message_id", true);
  const sourceChannel = (interaction.options.getChannel("source") ?? interaction.channel) as TextChannel;

  let original;
  try {
    original = await sourceChannel.messages.fetch(messageId);
  } catch {
    await interaction.reply({ content: "❌ Message introuvable dans ce channel.", flags: 64 });
    return;
  }

  const targetChannelId = subcommand === "leak" ? leaksChannelId : newsChannelId;
  const channel = (await interaction.client.channels.fetch(targetChannelId)) as TextChannel | null;

  if (!channel) {
    await interaction.reply({ content: "❌ Channel introuvable.", flags: 64 });
    return;
  }

  const pingRole = interaction.options.getRole("ping");
  const mention = pingRole ? `<@&${pingRole.id}>` : "";
  const fullContent = [mention, original.content].filter(Boolean).join("\n");

  const chunks = splitContent(fullContent);

  const SUBCOMMAND_LABELS: Record<string, string> = {
    update: "Mise à jour",
    patchnote: "Patch Note",
    leak: "Leak",
  };

  try {
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

      await channel.send(payload);
    }

    await interaction.reply({
      content: `✅ ${SUBCOMMAND_LABELS[subcommand]} publiée dans <#${targetChannelId}>.`,
      flags: 64,
    });
  } catch (err) {
    console.error("Failed to send news:", err);
    await interaction.reply({ content: "❌ Erreur lors de l'envoi du message.", flags: 64 });
  }
}
