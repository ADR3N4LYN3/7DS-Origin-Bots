import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { ApiClient } from "./api/client.js";
import { buildCharacterCommand, handleCharacterCommand, handleCharacterAutocomplete } from "./commands/character.js";
import { initBotEmojis } from "./utils/botEmojis.js";

// ── Error handling ──────────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

// ── Environment variables ────────────────────────────────────────────

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const API_BASE_URL = process.env.API_BASE_URL ?? "https://7dsorigin.app/api/bot";
const BOT_API_KEY = process.env.BOT_API_KEY!;

// ── API client ──────────────────────────────────────────────────────

const apiClient = new ApiClient(API_BASE_URL, BOT_API_KEY);

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("clientReady", async (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "7dsorigin.app", type: ActivityType.Watching }],
    status: "online",
  });
  await initBotEmojis(c);
});

// ── Interaction handling ────────────────────────────────────────────

client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "character") {
      await handleCharacterAutocomplete(interaction, apiClient);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "character") {
      await handleCharacterCommand(interaction, apiClient);
    }
  }
});

// ── Register slash commands ──────────────────────────────────────────

async function registerCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);

  const commands = [
    buildCharacterCommand(),
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
