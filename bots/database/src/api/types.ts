export interface CharacterSearchResult {
  slug: string;
  name: string;
  nameEn: string;
  rarity: string;
  element: string;
  elementKey: string;
  role: string;
  roleKey: string;
  imageUrl: string | null;
}

export interface CharacterBuff {
  buffId: string;
  buffType: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

export interface CharacterSkill {
  name: string;
  description: string;
  category: string;
  categoryKey: string;
  weaponType: string;
  weaponTypeKey: string;
  cooldown: number | null;
  damagePercent: string | null;
  hitCount: number | null;
  iconUrl: string | null;
  buffs: CharacterBuff[] | null;
}

export interface AdventureSkill {
  name: string;
  description: string;
}

export interface WeaponSlot {
  weapon: string;
  weaponKey: string;
  element: string;
  elementKey: string;
  role: string;
  roleKey: string;
}

export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDamage: number;
  accuracy: number;
  block: number;
  critResist: number;
  critDmgResist: number;
  blockDmgResist: number;
  pvpDmgUp: number;
  pvpDmgDown: number;
}

export interface CharacterData {
  slug: string;
  name: string;
  nameEn: string;
  description: string | null;
  rarity: string;
  element: string;
  elementKey: string;
  role: string;
  roleKey: string;
  imageUrl: string;
  bannerUrl: string | null;
  statsLevel: number;
  stats: CharacterStats;
  weaponSlots: WeaponSlot[];
  adventureSkill: AdventureSkill[];
  skills: CharacterSkill[];
  url: string;
}

// ── Pets ────────────────────────────────────────────────────────────

export interface PetSearchResult {
  slug: string;
  name: string;
  nameEn: string;
  rarity: string;
  petType: string;        // Localized
  petTypeKey: string;     // RIDING, GLIDING, FLYING, SUMMON
  imageUrl: string | null;
}

export interface PetSpeeds {
  walk: number | null;
  run: number | null;
  sprint: number | null;
  fly: number | null;
  glide: number | null;
  glideFwd: number | null;
  stamina: number | null;
}

export interface PetCooldowns {
  mountCast: number | null;
  summon: number | null;
  mount: number | null;
}

export interface PetFeedItem {
  id?: string;
  name: string;
  iconUrl?: string | null;
  [key: string]: unknown;
}

export interface PetObtainSource {
  type?: string;
  label?: string;
  [key: string]: unknown;
}

export interface PetCaptureData {
  difficulty?: string | number | null;
  baseRate?: number | null;
  resistance?: number | null;
  monsters?: unknown[];
  statsByLevel?: unknown;
}

export interface PetBuff {
  buffId: string;
  buffType: string;
  nameFr: string;
  nameEn: string;
  descriptionFr?: string;
  descriptionEn?: string;
}

export interface PetSkill {
  name: string;
  description: string | null;
  iconUrl: string | null;
  buffs: PetBuff[];
  gameId?: string;
  iconId?: string;
  [key: string]: unknown;
}

export interface PetData {
  slug: string;
  name: string;
  nameEn: string;
  rarity: string;
  petType: string;
  petTypeKey: string;                  // RIDING, GLIDING, FLYING, SUMMON
  obtainMethod: string;
  obtainMethodKey: string;             // CAPTURE, FEED, DEFAULT, OTHER, MONSTER_DROP, DUNGEON, QUEST, SHOP, FISHING
  autolootType: string | null;
  autolootTypeKey: string | null;      // DROP, MINING, COLLECTION | null
  mountable: boolean;
  imageUrl: string;
  iconUrl: string | null;
  speeds: PetSpeeds;
  cooldowns: PetCooldowns;
  feedItem: PetFeedItem | null;
  obtainSources: PetObtainSource[];
  captureData: PetCaptureData | null;
  activeSkills: PetSkill[];
  passiveSkill: PetSkill | null;
  url: string;
}
