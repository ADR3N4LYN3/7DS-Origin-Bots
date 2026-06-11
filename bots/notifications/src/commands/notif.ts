import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  ChannelType,
  type Client,
  type Role,
} from "discord.js";
import { randomUUID } from "node:crypto";
import { hasAdminRole } from "../utils.js";
import {
  addSubscription,
  removeSubscription,
  listSubscriptions,
  findSubscription,
  setState,
  type Subscription,
} from "../config/storage.js";
import { resolveYouTubeChannel, fetchLatestVideos } from "../sources/youtube.js";
import { resolveTwitchUser, fetchLiveStreams } from "../sources/twitch.js";
import { sendNotification } from "../poster.js";

export interface NotifConfig {
  twitchClientId: string;
  twitchClientSecret: string;
}

export function buildNotifCommand() {
  return new SlashCommandBuilder()
    .setName("notif")
    .setDescription("Gérer les notifications YouTube & Twitch (admin)")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Ajouter une chaîne à surveiller")
        .addStringOption((opt) =>
          opt
            .setName("plateforme")
            .setDescription("Plateforme à surveiller")
            .setRequired(true)
            .addChoices(
              { name: "YouTube", value: "youtube" },
              { name: "Twitch", value: "twitch" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("chaine")
            .setDescription("Lien, @handle, pseudo ou ID de la chaîne")
            .setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("salon")
            .setDescription("Salon Discord où poster la notification")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Rôle à mentionner (optionnel)").setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription("Message personnalisé. Variables : {role} {name} {title} {url} {game}")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Supprimer une notification")
        .addStringOption((opt) =>
          opt
            .setName("notification")
            .setDescription("La notification à supprimer")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lister toutes les notifications configurées"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("test")
        .setDescription("Envoyer une notification de test")
        .addStringOption((opt) =>
          opt
            .setName("notification")
            .setDescription("La notification à tester")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );
}

export async function handleNotifCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,
  client: Client,
  config: NotifConfig,
) {
  if (!hasAdminRole(interaction, adminRoleId)) {
    await interaction.reply({
      content: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
      flags: 64,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  switch (subcommand) {
    case "add":
      return handleAdd(interaction, config);
    case "remove":
      return handleRemove(interaction);
    case "list":
      return handleList(interaction);
    case "test":
      return handleTest(interaction, client, config);
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction, config: NotifConfig) {
  const platform = interaction.options.getString("plateforme", true) as "youtube" | "twitch";
  const source = interaction.options.getString("chaine", true);
  const channel = interaction.options.getChannel("salon", true);
  const role = interaction.options.getRole("role") as Role | null;
  const message = interaction.options.getString("message");

  await interaction.deferReply({ flags: 64 });

  let sourceId: string;
  let sourceName: string;
  let avatarUrl: string | null = null;

  if (platform === "youtube") {
    const resolved = await resolveYouTubeChannel(source).catch(() => null);
    if (!resolved) {
      await interaction.editReply(
        "❌ Chaîne YouTube introuvable. Essayez avec le lien complet de la chaîne, son @handle ou son ID (`UC...`).",
      );
      return;
    }
    sourceId = resolved.channelId;
    sourceName = resolved.name;
    avatarUrl = resolved.avatar;
  } else {
    if (!config.twitchClientId || !config.twitchClientSecret) {
      await interaction.editReply(
        "❌ Les identifiants Twitch (`TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`) ne sont pas configurés.",
      );
      return;
    }
    const user = await resolveTwitchUser(source, config.twitchClientId, config.twitchClientSecret).catch(
      () => null,
    );
    if (!user) {
      await interaction.editReply(
        "❌ Chaîne Twitch introuvable. Essayez avec le pseudo exact ou le lien `twitch.tv/...`.",
      );
      return;
    }
    sourceId = user.login;
    sourceName = user.displayName;
    avatarUrl = user.avatar;
  }

  // Avoid duplicate (same source posting in the same channel).
  const duplicate = listSubscriptions().find(
    (s) => s.platform === platform && s.sourceId === sourceId && s.discordChannelId === channel.id,
  );
  if (duplicate) {
    await interaction.editReply(
      `⚠️ **${sourceName}** est déjà surveillé dans <#${channel.id}> (\`${duplicate.id}\`).`,
    );
    return;
  }

  const sub: Subscription = {
    id: randomUUID().slice(0, 8),
    platform,
    sourceId,
    sourceName,
    avatarUrl,
    discordChannelId: channel.id,
    roleId: role?.id ?? null,
    message: message ?? null,
    createdAt: Date.now(),
  };
  addSubscription(sub);

  // Prime the state so we don't immediately re-announce existing content.
  try {
    if (platform === "youtube") {
      const videos = await fetchLatestVideos(sourceId);
      if (videos[0]) setState(sub.id, { lastVideoId: videos[0].videoId });
    } else {
      const live = await fetchLiveStreams([sourceId], config.twitchClientId, config.twitchClientSecret);
      setState(sub.id, { isLive: live.has(sourceId) });
    }
  } catch (err) {
    console.error("Failed to prime subscription state:", err);
  }

  const icon = platform === "youtube" ? "📺" : "🔴";
  await interaction.editReply(
    [
      `✅ ${icon} **${sourceName}** est maintenant surveillé !`,
      `> Salon : <#${channel.id}>`,
      role ? `> Mention : <@&${role.id}>` : "> Mention : aucune",
      `> ID : \`${sub.id}\``,
    ].join("\n"),
  );
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString("notification", true);
  const sub = findSubscription(id);
  if (!sub) {
    await interaction.reply({ content: "❌ Notification introuvable.", flags: 64 });
    return;
  }
  removeSubscription(id);
  await interaction.reply({
    content: `🗑️ Notification supprimée : **${sub.sourceName}** (${sub.platform}).`,
    flags: 64,
  });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const subs = listSubscriptions();
  if (subs.length === 0) {
    await interaction.reply({
      content: "📭 Aucune notification configurée. Utilisez `/notif add` pour commencer.",
      flags: 64,
    });
    return;
  }

  const format = (s: Subscription) => {
    const icon = s.platform === "youtube" ? "📺" : "🔴";
    const ping = s.roleId ? ` · <@&${s.roleId}>` : "";
    return `${icon} **${s.sourceName}** → <#${s.discordChannelId}>${ping}\n \`${s.id}\``;
  };

  const youtube = subs.filter((s) => s.platform === "youtube");
  const twitch = subs.filter((s) => s.platform === "twitch");

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📡 Notifications configurées")
    .setFooter({ text: "7DS Origin" })
    .setTimestamp();

  if (youtube.length) {
    embed.addFields({ name: `YouTube (${youtube.length})`, value: youtube.map(format).join("\n") });
  }
  if (twitch.length) {
    embed.addFields({ name: `Twitch (${twitch.length})`, value: twitch.map(format).join("\n") });
  }

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleTest(
  interaction: ChatInputCommandInteraction,
  client: Client,
  config: NotifConfig,
) {
  const id = interaction.options.getString("notification", true);
  const sub = findSubscription(id);
  if (!sub) {
    await interaction.reply({ content: "❌ Notification introuvable.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  // Try to send a notification with REAL live data, exactly as the automatic one would.
  if (sub.platform === "twitch") {
    const live = await fetchLiveStreams(
      [sub.sourceId],
      config.twitchClientId,
      config.twitchClientSecret,
    ).catch(() => new Map());
    const stream = live.get(sub.sourceId.toLowerCase());
    if (stream) {
      await sendNotification(client, sub, {
        kind: "twitch",
        name: stream.userName || sub.sourceName,
        title: stream.title || "Live en cours",
        url: `https://twitch.tv/${stream.userLogin}`,
        thumbnail: `${stream.thumbnailUrl}?cb=${encodeURIComponent(stream.startedAt)}`,
        avatar: sub.avatarUrl,
        game: stream.gameName,
        login: stream.userLogin,
        viewers: stream.viewerCount,
      });
      await interaction.editReply(
        `✅ Notification **réelle** (live en cours) envoyée dans <#${sub.discordChannelId}>.`,
      );
      return;
    }
  } else {
    const videos = await fetchLatestVideos(sub.sourceId).catch(() => []);
    const video = videos[0];
    if (video) {
      await sendNotification(client, sub, {
        kind: "youtube",
        name: sub.sourceName,
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        avatar: sub.avatarUrl,
      });
      await interaction.editReply(
        `✅ Aperçu **réel** (dernière vidéo) envoyé dans <#${sub.discordChannelId}>.`,
      );
      return;
    }
  }

  // Fallback: not live / no video yet → send a clearly-labelled dummy.
  const url =
    sub.platform === "youtube"
      ? `https://www.youtube.com/channel/${sub.sourceId}`
      : `https://twitch.tv/${sub.sourceId}`;

  await sendNotification(client, sub, {
    kind: sub.platform,
    name: sub.sourceName,
    title: "Ceci est une notification de test",
    url,
    channelUrl:
      sub.platform === "youtube"
        ? `https://www.youtube.com/channel/${sub.sourceId}?sub_confirmation=1`
        : `https://twitch.tv/${sub.sourceId}/about`,
    thumbnail: null,
    avatar: sub.avatarUrl,
    game: sub.platform === "twitch" ? "Catégorie de test" : null,
    login: sub.sourceId,
    viewers: sub.platform === "twitch" ? 123 : null,
  });

  await interaction.editReply(
    sub.platform === "twitch"
      ? `⚠️ **${sub.sourceName}** n'est pas en live — exemple factice envoyé dans <#${sub.discordChannelId}>.`
      : `⚠️ Aucune vidéo trouvée — exemple factice envoyé dans <#${sub.discordChannelId}>.`,
  );
}

// ── Autocomplete for remove / test ───────────────────────────────────

export async function handleNotifAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const choices = listSubscriptions()
    .filter(
      (s) =>
        s.sourceName.toLowerCase().includes(focused) ||
        s.id.includes(focused) ||
        s.platform.includes(focused),
    )
    .slice(0, 25)
    .map((s) => ({
      name: `${s.platform === "youtube" ? "📺" : "🔴"} ${s.sourceName} → #${s.id}`.slice(0, 100),
      value: s.id,
    }));
  await interaction.respond(choices);
}
