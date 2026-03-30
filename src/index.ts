import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  type TextChannel,
} from "discord.js";
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const DISCORD_BOT_TOKEN = requireEnv("DISCORD_BOT_TOKEN");
const DISCORD_CHANNEL_ID = requireEnv("DISCORD_CHANNEL_ID");
const DISCORD_ROLE_ID = requireEnv("DISCORD_ROLE_ID");
const WEBHOOK_SECRET = requireEnv("WEBHOOK_SECRET");
const PORT = Number(process.env.PORT ?? 3001);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANNER_PATH = path.join(__dirname, "..", "public", "Banner.png");
const ICON_PATH = path.join(__dirname, "..", "public", "icon-192.png");

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
// Embed builder
// ---------------------------------------------------------------------------

function buildMessage(payload: CodeApprovedPayload) {
  const { code, rewardsFr, rewardsEn, expiresAt } = payload;

  const banner = new AttachmentBuilder(BANNER_PATH, { name: "banner.png" });
  const icon = new AttachmentBuilder(ICON_PATH, { name: "icon.png" });

  const expireLine = expiresAt
    ? `⏰ Expire <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>\n`
    : "";

  const embed = new EmbedBuilder()
    .setColor(0xc8922a)
    .setAuthor({
      name: "7DS Origin",
      iconURL: "attachment://icon.png",
      url: "https://7dsorigin.app",
    })
    .setTitle("🎁 Nouveau Code Promo")
    .setThumbnail("attachment://banner.png")
    .setDescription(
      [
        `\`\`\`fix\n${code}\`\`\``,
        expireLine,
        `━━━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    )
    .addFields(
      { name: "🇫🇷 Récompenses", value: rewardsFr, inline: true },
      { name: "🇬🇧 Rewards", value: rewardsEn, inline: true },
    )
    .setFooter({ text: "7DS Origin • Codes Promo" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Utiliser le code")
      .setURL("https://coupon.netmarble.com/nanaori")
      .setStyle(ButtonStyle.Link)
      .setEmoji("🎟️"),
  );

  return { embed, row, files: [banner, icon] };
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

  if (!code || !rewardsFr || !rewardsEn) {
    res
      .status(400)
      .json({ error: "Missing fields: code, rewardsFr, rewardsEn" });
    return;
  }

  // ── Build & send Discord message ────────────────────────────────────
  const { embed, row, files } = buildMessage({ code, rewardsFr, rewardsEn, expiresAt });

  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNEL_ID,
    )) as TextChannel | null;

    if (!channel) {
      console.error(`Channel ${DISCORD_CHANNEL_ID} not found`);
      res.status(500).json({ error: "Discord channel not found" });
      return;
    }

    await channel.send({ content: `<@&${DISCORD_ROLE_ID}>`, embeds: [embed], components: [row], files });
    console.log(`Promo code "${code}" posted to #${channel.name}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to send Discord message:", err);
    res.status(500).json({ error: "Failed to post to Discord" });
  }
});

// ── Test endpoint (sends a fake embed to verify design) ───────────────
app.get("/test-embed", async (_req, res) => {
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNEL_ID,
    )) as TextChannel | null;

    if (!channel) {
      res.status(500).json({ error: "Discord channel not found" });
      return;
    }

    const { embed, row, files } = buildMessage({
      code: "TEST7DS2026",
      rewardsFr: "100 Diamants\n50 Stamina\n1 SSR Ticket",
      rewardsEn: "100 Diamonds\n50 Stamina\n1 SSR Ticket",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await channel.send({ content: `<@&${DISCORD_ROLE_ID}>`, embeds: [embed], components: [row], files });
    res.json({ ok: true, message: "Test embed sent" });
  } catch (err) {
    console.error("Test embed failed:", err);
    res.status(500).json({ error: "Failed to send test embed" });
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
