import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(process.cwd(), "data", "giveaways.json");

// Une participation = un membre Discord + les infos saisies dans le modal.
export interface GiveawayEntry {
  userId: string;
  pseudo: string; // pseudo en jeu
  uid: string; // UID Lootbar (livraison du lot)
  joinedAt: number; // ms timestamp
}

export interface Giveaway {
  messageId: string;
  channelId: string;
  guildId: string;
  hostId: string;
  prize1: string;
  prize2: string | null;
  prize3: string | null;
  endsAt: number; // ms timestamp
  ended: boolean;
  entries: GiveawayEntry[];
  winners: { tier: 1 | 2 | 3; userId: string }[]; // populated on end / reroll
  title?: string | null; // titre personnalisé optionnel
}

// Ancien format : `participants: string[]` (avant le modal pseudo/UID).
interface LegacyGiveaway extends Omit<Giveaway, "entries"> {
  entries?: GiveawayEntry[];
  participants?: string[];
}

// Les giveaways d'avant le modal n'ont ni pseudo ni UID : on les remonte en
// entries vides, le membre complète au prochain clic sur Participer.
function normalize(raw: LegacyGiveaway[]): Giveaway[] {
  return raw.map((g) => {
    const { participants, entries, ...rest } = g;
    if (entries) return { ...rest, entries };
    const legacy = participants ?? [];
    return {
      ...rest,
      entries: legacy.map((userId) => ({ userId, pseudo: "", uid: "", joinedAt: 0 })),
    };
  });
}

// Inscrit un membre, ou met à jour ses infos s'il participait déjà.
export function upsertEntry(
  messageId: string,
  userId: string,
  pseudo: string,
  uid: string,
): { added: boolean; total: number } {
  const data = loadGiveaways();
  const g = data.find((x) => x.messageId === messageId);
  if (!g) return { added: false, total: 0 };

  const existing = g.entries.find((e) => e.userId === userId);
  if (existing) {
    existing.pseudo = pseudo;
    existing.uid = uid;
    if (!existing.joinedAt) existing.joinedAt = Date.now();
    saveGiveaways(data);
    return { added: false, total: g.entries.length };
  }

  g.entries.push({ userId, pseudo, uid, joinedAt: Date.now() });
  saveGiveaways(data);
  return { added: true, total: g.entries.length };
}

export function removeParticipant(messageId: string, userId: string): { removed: boolean; total: number } {
  const data = loadGiveaways();
  const g = data.find((x) => x.messageId === messageId);
  if (!g) return { removed: false, total: 0 };
  const idx = g.entries.findIndex((e) => e.userId === userId);
  if (idx < 0) return { removed: false, total: g.entries.length };
  g.entries.splice(idx, 1);
  saveGiveaways(data);
  return { removed: true, total: g.entries.length };
}

export function findEntry(g: Giveaway, userId: string): GiveawayEntry | undefined {
  return g.entries.find((e) => e.userId === userId);
}

// Un même compte Lootbar ne peut pas être joué par deux comptes Discord.
// Le champ étant facultatif, le vide n'appartient à personne : sans ce garde-fou
// le premier participant sans Lootbar bloquerait tous les suivants.
export function findEntryByUid(g: Giveaway, uid: string, exceptUserId: string): GiveawayEntry | undefined {
  const norm = uid.trim().toLowerCase();
  if (!norm) return undefined;
  return g.entries.find((e) => e.userId !== exceptUserId && e.uid.toLowerCase() === norm);
}

export function participantIds(g: Giveaway): string[] {
  return g.entries.map((e) => e.userId);
}

let cache: Giveaway[] | null = null;

export function loadGiveaways(): Giveaway[] {
  if (cache) return cache;
  if (!existsSync(DATA_PATH)) {
    cache = [];
    return cache;
  }
  cache = normalize(JSON.parse(readFileSync(DATA_PATH, "utf-8")) as LegacyGiveaway[]);
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
