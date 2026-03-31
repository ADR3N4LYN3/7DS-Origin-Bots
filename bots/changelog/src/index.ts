import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { buildNewsCommand, handleNewsCommand } from "./commands/news.js";
import { buildRepublishCommand, handleRepublishCommand } from "./commands/repost.js";

// ── Environment variables ────────────────────────────────────────────

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const CHANNEL_NEWS = process.env.CHANNEL_NEWS!;
const CHANNEL_LEAKS = process.env.CHANNEL_LEAKS!;
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID!;

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "les news 7DS", type: ActivityType.Watching }],
    status: "online",
  });
});

// ── Slash command handling ───────────────────────────────────────────

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "news") {
    await handleNewsCommand(interaction, CHANNEL_NEWS, CHANNEL_LEAKS, DISCORD_ADMIN_ROLE_ID);
  } else if (interaction.commandName === "republish") {
    await handleRepublishCommand(interaction, DISCORD_ADMIN_ROLE_ID);
  }
});

// ── Register slash commands ──────────────────────────────────────────

async function registerCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);

  const commands = [
    buildNewsCommand(),
    buildRepublishCommand(),
  ].map((c) => c.toJSON());

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
