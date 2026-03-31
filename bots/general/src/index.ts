import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { buildClearCommand, handleClearCommand } from "./commands/clear.js";
import { buildSondageCommand, handleSondageCommand } from "./commands/sondage.js";
import { buildReactionRoleCommand, handleReactionRoleCommand, loadReactionRoles } from "./commands/reactionrole.js";
import { buildRepostCommand, handleRepostCommand } from "./commands/repost.js";
import { buildTestWelcomeCommand, handleTestWelcomeCommand } from "./commands/testwelcome.js";
import { handleGuildMemberAdd } from "./events/welcome.js";

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

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
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

// ── Reaction roles ──────────────────────────────────────────────────

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const data = loadReactionRoles();
  const config = data.find((r) => r.messageId === reaction.message.id);
  if (!config) return;

  const emoji = reaction.emoji.name;
  if (!emoji) return;
  const roleId = config.mappings[emoji];
  if (!roleId) return;

  const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.add(roleId).catch((err) =>
    console.error("Failed to add role:", err),
  );

  const role = reaction.message.guild?.roles.cache.get(roleId);
  const channel = reaction.message.channel;
  if (channel && "send" in channel) {
    const msg = await channel.send(`✅ <@${user.id}> → rôle **${role?.name ?? roleId}** ajouté !`).catch(() => null);
    if (msg) setTimeout(() => msg.delete().catch(() => {}), 3000);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const data = loadReactionRoles();
  const config = data.find((r) => r.messageId === reaction.message.id);
  if (!config) return;

  const emoji = reaction.emoji.name;
  if (!emoji) return;
  const roleId = config.mappings[emoji];
  if (!roleId) return;

  const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.remove(roleId).catch((err) =>
    console.error("Failed to remove role:", err),
  );

  const role = reaction.message.guild?.roles.cache.get(roleId);
  const channel = reaction.message.channel;
  if (channel && "send" in channel) {
    const msg = await channel.send(`❌ <@${user.id}> → rôle **${role?.name ?? roleId}** retiré.`).catch(() => null);
    if (msg) setTimeout(() => msg.delete().catch(() => {}), 3000);
  }
});

// ── Slash command handling ───────────────────────────────────────────

const COMMAND_HANDLERS: Record<string, (interaction: any) => Promise<void>> = {
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
