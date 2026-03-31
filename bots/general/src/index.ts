import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { buildClearCommand, handleClearCommand } from "./commands/clear.js";
import { buildRulesCommand, handleRulesCommand } from "./commands/rules.js";
import { buildEmbedCommand, handleEmbedCommand } from "./commands/embed.js";
import { buildSondageCommand, handleSondageCommand } from "./commands/sondage.js";
import { buildUserinfoCommand, handleUserinfoCommand } from "./commands/userinfo.js";
import { buildReactionRoleCommand, handleReactionRoleCommand, loadReactionRoles } from "./commands/reactionrole.js";
import { buildTestWelcomeCommand, handleTestWelcomeCommand } from "./commands/testwelcome.js";
import { handleGuildMemberAdd } from "./events/welcome.js";

// ── Environment variables ────────────────────────────────────────────

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const CHANNEL_WELCOME = process.env.CHANNEL_WELCOME!;
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID!;

// ── Discord client ───────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

client.once("clientReady", (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
});

// ── Welcome event ───────────────────────────────────────────────────

client.on("guildMemberAdd", (member) => {
  handleGuildMemberAdd(member, CHANNEL_WELCOME);
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
});

// ── Slash command handling ───────────────────────────────────────────

const COMMAND_HANDLERS: Record<string, (interaction: any) => Promise<void>> = {
  clear: (i) => handleClearCommand(i, DISCORD_ADMIN_ROLE_ID),
  rules: (i) => handleRulesCommand(i, DISCORD_ADMIN_ROLE_ID),
  embed: (i) => handleEmbedCommand(i, DISCORD_ADMIN_ROLE_ID),
  sondage: (i) => handleSondageCommand(i),
  userinfo: (i) => handleUserinfoCommand(i),
  reactionrole: (i) => handleReactionRoleCommand(i, DISCORD_ADMIN_ROLE_ID),
  testwelcome: (i) => handleTestWelcomeCommand(i, DISCORD_ADMIN_ROLE_ID, CHANNEL_WELCOME),
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
    buildRulesCommand(),
    buildEmbedCommand(),
    buildSondageCommand(),
    buildUserinfoCommand(),
    buildReactionRoleCommand(),
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
