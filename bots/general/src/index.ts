import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import { buildClearCommand, handleClearCommand } from "./commands/clear.js";
import { buildSondageCommand, handleSondageCommand } from "./commands/sondage.js";
import { buildReactionRoleCommand, handleReactionRoleCommand, handleRoleButtonClick } from "./commands/reactionrole.js";
import { buildRepostCommand, handleRepostCommand } from "./commands/repost.js";
import { buildTestWelcomeCommand, handleTestWelcomeCommand } from "./commands/testwelcome.js";
import { handleGuildMemberAdd } from "./events/welcome.js";
import { handleGuildMemberRemove } from "./events/leave.js";
import { handleGuildMemberUpdate } from "./events/memberUpdate.js";
import { handleGuildBanAdd, handleGuildBanRemove } from "./events/ban.js";
import { initLogChannel } from "./events/log.js";
import { handleMessageDelete } from "./events/messageDelete.js";
import { handleMessageUpdate } from "./events/messageUpdate.js";
import { handleVoiceStateUpdate } from "./events/voice.js";

// ── Error handling ──────────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

// ── Environment variables ────────────────────────────────────────────

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const CHANNEL_WELCOME = process.env.CHANNEL_WELCOME!;
const CHANNEL_RULES = process.env.CHANNEL_RULES || undefined;
const CHANNEL_ROLES = process.env.CHANNEL_ROLES || undefined;
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID!;
const WELCOME_BANNER_URL = process.env.WELCOME_BANNER_URL || undefined;
const CHANNEL_LOGS = process.env.CHANNEL_LOGS || undefined;

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

client.once("clientReady", (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "7DS Origin", type: ActivityType.Watching }],
    status: "online",
  });
  initLogChannel(c, CHANNEL_LOGS);
});

// ── Welcome event ───────────────────────────────────────────────────

const welcomeConfig = {
  welcomeChannelId: CHANNEL_WELCOME,
  rulesChannelId: CHANNEL_RULES,
  rolesChannelId: CHANNEL_ROLES,
  bannerUrl: WELCOME_BANNER_URL,
};

client.on("guildMemberAdd", (member) => {
  handleGuildMemberAdd(member, welcomeConfig);
});

// ── Tracking events ────────────────────────────────────────────────

client.on("guildMemberRemove", (member) => {
  handleGuildMemberRemove(member);
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  handleGuildMemberUpdate(oldMember, newMember);
});

client.on("guildBanAdd", (ban) => {
  handleGuildBanAdd(ban);
});

client.on("guildBanRemove", (ban) => {
  handleGuildBanRemove(ban);
});

client.on("messageDelete", (message) => {
  handleMessageDelete(message);
});

client.on("messageUpdate", (oldMessage, newMessage) => {
  handleMessageUpdate(oldMessage, newMessage);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  handleVoiceStateUpdate(oldState, newState);
});

// ── Role buttons ────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("rr:")) return;
  await handleRoleButtonClick(interaction);
});

// ── Slash command handling ───────────────────────────────────────────

const COMMAND_HANDLERS: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
  clear: (i) => handleClearCommand(i, DISCORD_ADMIN_ROLE_ID),
  sondage: (i) => handleSondageCommand(i, DISCORD_ADMIN_ROLE_ID),
  reactionrole: (i) => handleReactionRoleCommand(i, DISCORD_ADMIN_ROLE_ID),
  repost: (i) => handleRepostCommand(i, DISCORD_ADMIN_ROLE_ID),
  testwelcome: (i) => handleTestWelcomeCommand(i, DISCORD_ADMIN_ROLE_ID, welcomeConfig),
};

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = COMMAND_HANDLERS[interaction.commandName];
  if (handler) await handler(interaction);
});

// ── Register slash commands ──────────────────────────────────────────

async function registerCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);

  const commands = [
    buildClearCommand(),
    buildSondageCommand(),
    buildReactionRoleCommand(),
    buildRepostCommand(),
    buildTestWelcomeCommand(),
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
