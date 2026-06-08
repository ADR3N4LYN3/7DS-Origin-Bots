import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const SUBS_PATH = join(DATA_DIR, "subscriptions.json");
const STATE_PATH = join(DATA_DIR, "state.json");

export type Platform = "youtube" | "twitch";

export interface Subscription {
  id: string; // short unique id
  platform: Platform;
  sourceId: string; // youtube channel id (UC...) or twitch login (lowercase)
  sourceName: string; // display name shown to humans
  avatarUrl: string | null; // channel/streamer avatar (author icon)
  discordChannelId: string; // where the notification is posted
  roleId: string | null; // role to ping (optional)
  message: string | null; // custom message template (optional)
  createdAt: number;
}

export interface SourceState {
  lastVideoId?: string; // youtube: most recent video already announced
  isLive?: boolean; // twitch: whether the channel was live at last check
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// ── Subscriptions ────────────────────────────────────────────────────

let subsCache: Subscription[] | null = null;

export function listSubscriptions(): Subscription[] {
  if (subsCache) return subsCache;
  if (!existsSync(SUBS_PATH)) {
    subsCache = [];
    return subsCache;
  }
  subsCache = JSON.parse(readFileSync(SUBS_PATH, "utf-8"));
  return subsCache!;
}

function saveSubs(data: Subscription[]) {
  ensureDir();
  writeFileSync(SUBS_PATH, JSON.stringify(data, null, 2));
  subsCache = data;
}

export function addSubscription(sub: Subscription) {
  const data = listSubscriptions();
  data.push(sub);
  saveSubs(data);
}

export function removeSubscription(id: string): boolean {
  const data = listSubscriptions();
  const idx = data.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  data.splice(idx, 1);
  saveSubs(data);

  const state = loadState();
  if (state[id]) {
    delete state[id];
    saveState(state);
  }
  return true;
}

export function findSubscription(id: string): Subscription | undefined {
  return listSubscriptions().find((s) => s.id === id);
}

// ── Per-source state (what has already been announced) ───────────────

let stateCache: Record<string, SourceState> | null = null;

function loadState(): Record<string, SourceState> {
  if (stateCache) return stateCache;
  if (!existsSync(STATE_PATH)) {
    stateCache = {};
    return stateCache;
  }
  stateCache = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  return stateCache!;
}

function saveState(state: Record<string, SourceState>) {
  ensureDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  stateCache = state;
}

export function getState(id: string): SourceState {
  return loadState()[id] ?? {};
}

export function setState(id: string, patch: Partial<SourceState>) {
  const state = loadState();
  state[id] = { ...(state[id] ?? {}), ...patch };
  saveState(state);
}
