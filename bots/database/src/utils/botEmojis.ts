import type { Client } from "discord.js";

const cache = new Map<string, string>();

export async function initBotEmojis(client: Client): Promise<void> {
  const app = client.application;
  if (!app) return;

  try {
    const emojis = await app.emojis.fetch();
    cache.clear();
    for (const emoji of emojis.values()) {
      if (!emoji.name) continue;
      const prefix = emoji.animated ? "a" : "";
      cache.set(emoji.name, `<${prefix}:${emoji.name}:${emoji.id}>`);
    }
    console.log(`Loaded ${cache.size} application emojis`);
  } catch (err) {
    console.error("Failed to fetch application emojis:", err);
  }
}

export function getEmoji(name: string): string | null {
  return cache.get(name) ?? null;
}
