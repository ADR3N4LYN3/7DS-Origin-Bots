import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(process.cwd(), "data", "giveaways.json");

export interface Giveaway {
  messageId: string;
  channelId: string;
  guildId: string;
  hostId: string;
  prize1: string;
  prize2: string;
  prize3: string;
  endsAt: number; // ms timestamp
  ended: boolean;
  winners: { tier: 1 | 2 | 3; userId: string }[]; // populated on end / reroll
}

let cache: Giveaway[] | null = null;

export function loadGiveaways(): Giveaway[] {
  if (cache) return cache;
  if (!existsSync(DATA_PATH)) {
    cache = [];
    return cache;
  }
  cache = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  return cache!;
}

export function saveGiveaways(data: Giveaway[]) {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  cache = data;
}

export function addGiveaway(g: Giveaway) {
  const data = loadGiveaways();
  data.push(g);
  saveGiveaways(data);
}

export function updateGiveaway(messageId: string, patch: Partial<Giveaway>) {
  const data = loadGiveaways();
  const idx = data.findIndex((g) => g.messageId === messageId);
  if (idx >= 0) {
    data[idx] = { ...data[idx], ...patch };
    saveGiveaways(data);
  }
}

export function findGiveaway(messageId: string): Giveaway | undefined {
  return loadGiveaways().find((g) => g.messageId === messageId);
}

export function listActiveGiveaways(guildId: string): Giveaway[] {
  return loadGiveaways().filter((g) => g.guildId === guildId && !g.ended);
}
