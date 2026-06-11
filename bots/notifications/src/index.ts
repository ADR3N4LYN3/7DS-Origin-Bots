import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import {
  buildNotifCommand,
  handleNotifCommand,
  handleNotifAutocomplete,
  type NotifConfig,
} from "./commands/notif.js";
import { listSubscriptions, getState, setState } from "./config/storage.js";
import { fetchLatestVideos } from "./sources/youtube.js";
import { fetchLiveStreams } from "./sources/twitch.js";
import { sendNotification } from "./poster.js";

// ── Error handling ──────────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

// ── Environment variables ────────────────────────────────────────────

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID!;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const YOUTUBE_POLL_SECONDS = Number(process.env.YOUTUBE_POLL_SECONDS || 180);
const TWITCH_POLL_SECONDS = Number(process.env.TWITCH_POLL_SECONDS || 60);

const notifConfig: NotifConfig = {
  twitchClientId: TWITCH_CLIENT_ID,
  twitchClientSecret: TWITCH_CLIENT_SECRET,
};

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "7DS Origin", type: ActivityType.Watching }],
    status: "online",
  });
  startPolling(c);
});

// ── Interactions ────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isAutocomplete() && interaction.commandName === "notif") {
    await handleNotifAutocomplete(interaction);
    return;
  }
  if (interaction.isChatInputCommand() && interaction.commandName === "notif") {
    await handleNotifCommand(interaction, DISCORD_ADMIN_ROLE_ID, client, notifConfig);
  }
});

// ── Polling loops ────────────────────────────────────────────────────

function startPolling(client: Client) {
  void checkYouTube(client);
  void checkTwitch(client);
  setInterval(() => void checkYouTube(client), YOUTUBE_POLL_SECONDS * 1000);
  setInterval(() => void checkTwitch(client), TWITCH_POLL_SECONDS * 1000);
  console.log(
    `Polling started — YouTube every ${YOUTUBE_POLL_SECONDS}s, Twitch every ${TWITCH_POLL_SECONDS}s`,
  );
}

async function checkYouTube(client: Client) {
  const subs = listSubscriptions().filter((s) => s.platform === "youtube");
  for (const sub of subs) {
    try {
      const videos = await fetchLatestVideos(sub.sourceId);
      if (videos.length === 0) continue;

      const state = getState(sub.id);
      const latestId = videos[0].videoId;

      // First time we see this channel: just record the latest video, don't spam.
      if (!state.lastVideoId) {
        setState(sub.id, { lastVideoId: latestId });
        continue;
      }
      if (latestId === state.lastVideoId) continue;

      // Collect everything newer than the last announced video.
      const fresh = [];
      let found = false;
      for (const video of videos) {
        if (video.videoId === state.lastVideoId) {
          found = true;
          break;
        }
        fresh.push(video);
      }
      // If the marker fell off the feed, only announce the newest to avoid a burst.
      const toAnnounce = found ? fresh : fresh.slice(0, 1);

      for (const video of toAnnounce.reverse()) {
        await sendNotification(client, sub, {
          kind: "youtube",
          name: sub.sourceName,
          title: video.title,
          url: video.url,
          channelUrl: `https://www.youtube.com/channel/${sub.sourceId}?sub_confirmation=1`,
          thumbnail: video.thumbnail,
          avatar: sub.avatarUrl,
        });
      }
      setState(sub.id, { lastVideoId: latestId });
    } catch (err) {
      console.error(`YouTube check failed for ${sub.sourceName}:`, err);
    }
  }
}

async function checkTwitch(client: Client) {
  const subs = listSubscriptions().filter((s) => s.platform === "twitch");
  if (subs.length === 0) return;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.warn("Twitch subscriptions exist but TWITCH_CLIENT_ID/SECRET are not set.");
    return;
  }

  const logins = [...new Set(subs.map((s) => s.sourceId.toLowerCase()))];
  let live: Map<string, import("./sources/twitch.js").TwitchStream>;
  try {
    live = await fetchLiveStreams(logins, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
  } catch (err) {
    console.error("Twitch poll failed:", err);
    return;
  }

  for (const sub of subs) {
    // Isolate each channel: a failing one (e.g. missing perms) must not abort the rest.
    try {
      const login = sub.sourceId.toLowerCase();
      const stream = live.get(login);
      const state = getState(sub.id);

      // First observation: record current status without announcing.
      if (state.isLive === undefined) {
        setState(sub.id, { isLive: !!stream });
        continue;
      }

      if (stream && !state.isLive) {
        await sendNotification(client, sub, {
          kind: "twitch",
          name: stream.userName || sub.sourceName,
          title: stream.title || "Live en cours",
          url: `https://twitch.tv/${stream.userLogin}`,
          channelUrl: `https://twitch.tv/${stream.userLogin}/about`,
          // Cache-bust per stream so Discord shows the current preview, not a stale one.
          thumbnail: `${stream.thumbnailUrl}?cb=${encodeURIComponent(stream.startedAt)}`,
          avatar: sub.avatarUrl,
          game: stream.gameName,
          login: stream.userLogin,
          viewers: stream.viewerCount,
        });
        setState(sub.id, { isLive: true });
      } else if (!stream && state.isLive) {
        setState(sub.id, { isLive: false });
      }
    } catch (err) {
      console.error(`Twitch notify failed for ${sub.sourceName}:`, err);
    }
  }
}

// ── Register slash commands ──────────────────────────────────────────

async function registerCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);
  const commands = [buildNotifCommand()].map((c) => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), {
    body: commands,
  });
  console.log("Slash commands registered");
}

// ── Bootstrap ────────────────────────────────────────────────────────

async function main() {
  await client.login(DISCORD_TOKEN);
  await registerCommands();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
