import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  type TextChannel,
} from "discord.js";
import express from "express";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const DISCORD_BOT_TOKEN = requireEnv("DISCORD_BOT_TOKEN");
const DISCORD_CHANNEL_ID = requireEnv("DISCORD_CHANNEL_ID");
const WEBHOOK_SECRET = requireEnv("WEBHOOK_SECRET");
const PORT = Number(process.env.PORT ?? 3001);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", (c) => {
  console.log(`Discord bot ready — logged in as ${c.user.tag}`);
});

// ---------------------------------------------------------------------------
// Webhook payload type
// ---------------------------------------------------------------------------

interface CodeApprovedPayload {
  code: string;
  rewardsFr: string;
  rewardsEn: string;
  expiresAt: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

// ---------------------------------------------------------------------------
// Express HTTP server
// ---------------------------------------------------------------------------

const app = express();

// Parse JSON but keep the raw body for HMAC verification
app.use(
  express.json({
    verify(_req, _res, buf) {
      // Attach raw buffer to request for later HMAC check
      (_req as express.Request & { rawBody: Buffer }).rawBody = buf;
    },
  }),
);

app.post("/webhook/code-approved", async (req, res) => {
  // ── Signature check ─────────────────────────────────────────────────
  const signature = req.headers["x-signature"] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: "Missing x-signature header" });
    return;
  }

  const rawBody = (req as express.Request & { rawBody: Buffer }).rawBody;
  if (!verifySignature(rawBody, signature)) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  // ── Payload validation ──────────────────────────────────────────────
  const { code, rewardsFr, rewardsEn, expiresAt } =
    req.body as CodeApprovedPayload;

  if (!code || !rewardsFr || !rewardsEn || !expiresAt) {
    res
      .status(400)
      .json({ error: "Missing fields: code, rewardsFr, rewardsEn, expiresAt" });
    return;
  }

  // ── Build Discord embed ─────────────────────────────────────────────
  const expDate = new Date(expiresAt);
  const discordTimestamp = `<t:${Math.floor(expDate.getTime() / 1000)}:F>`;

  const embed = new EmbedBuilder()
    .setColor(0xf5a623)
    .setTitle("🎁 Nouveau Code Promo / New Promo Code")
    .addFields(
      { name: "Code", value: `\`${code}\``, inline: true },
      { name: "Expiration", value: discordTimestamp, inline: true },
      { name: "\u200B", value: "\u200B" },
      { name: "🇫🇷 Récompenses", value: rewardsFr },
      { name: "🇬🇧 Rewards", value: rewardsEn },
    )
    .setFooter({ text: "7DS Origin — Code Promo" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Redeem")
      .setURL("https://coupon.netmarble.com/nanaori")
      .setStyle(ButtonStyle.Link),
  );

  // ── Send to Discord ─────────────────────────────────────────────────
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNEL_ID,
    )) as TextChannel | null;

    if (!channel) {
      console.error(`Channel ${DISCORD_CHANNEL_ID} not found`);
      res.status(500).json({ error: "Discord channel not found" });
      return;
    }

    await channel.send({ embeds: [embed], components: [row] });
    console.log(`Promo code "${code}" posted to #${channel.name}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to send Discord message:", err);
    res.status(500).json({ error: "Failed to post to Discord" });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", discord: client.isReady() });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  await client.login(DISCORD_BOT_TOKEN);
  app.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
