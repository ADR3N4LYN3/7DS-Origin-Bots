/**
 * One-off sync: upload every mastery item icon as a Discord application emoji
 * named `item_{itemId}`, so the bot can show item icons in the Mastery tab.
 *
 * Idempotent — skips items that already have an emoji. Re-run after new items appear.
 *
 * Run from bots/database:  pnpm sync:emojis
 * Requires .env: DISCORD_TOKEN, DISCORD_CLIENT_ID, API_BASE_URL, BOT_API_KEY
 */
import sharp from "sharp";

const TOKEN = process.env.DISCORD_TOKEN!;
const APP_ID = process.env.DISCORD_CLIENT_ID!;
const API_BASE = (process.env.API_BASE_URL ?? "https://7dsorigin.app/api/bot").replace(/\/$/, "");
const API_KEY = process.env.BOT_API_KEY!;
const DISCORD_API = "https://discord.com/api/v10";

interface Item {
  itemId: string;
  name: string;
  iconUrl: string | null;
}

function discord(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function listEmojiNames(): Promise<Set<string>> {
  const res = await discord(`/applications/${APP_ID}/emojis`);
  if (!res.ok) throw new Error(`list emojis → ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { items: { name: string }[] };
  return new Set(data.items.map((e) => e.name));
}

/** Download an image (webp/png/…) and re-encode to a 128px PNG data URI (Discord rejects webp). */
async function toPngDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const png = await sharp(input).resize(128, 128, { fit: "inside" }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function createEmoji(name: string, image: string): Promise<void> {
  for (;;) {
    const res = await discord(`/applications/${APP_ID}/emojis`, {
      method: "POST",
      body: JSON.stringify({ name, image }),
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after") ?? "1");
      console.log(`  …rate limited, waiting ${retry}s`);
      await new Promise((r) => setTimeout(r, (retry + 0.5) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return;
  }
}

async function main(): Promise<void> {
  const res = await fetch(`${API_BASE}/items?usage=mastery&lang=fr`, { headers: { "x-api-key": API_KEY } });
  if (!res.ok) throw new Error(`GET /items → ${res.status}`);
  const items = (await res.json()) as Item[];
  console.log(`${items.length} items from API`);

  const existing = await listEmojiNames();
  let created = 0;
  let skipped = 0;

  for (const it of items) {
    const name = `item_${it.itemId}`;
    if (existing.has(name)) { skipped++; continue; }
    if (!it.iconUrl) { console.log(`  - ${name}: no icon, skipped`); continue; }
    try {
      await createEmoji(name, await toPngDataUri(it.iconUrl));
      created++;
      console.log(`  + ${name}  (${it.name})`);
    } catch (err) {
      console.error(`  ! ${name}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDone — created ${created}, already present ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
