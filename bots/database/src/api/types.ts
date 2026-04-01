export interface CharacterSearchResult {
  slug: string;
  name: string;
  nameEn: string;
  rarity: string;
  element: string;
  role: string;
}

export interface CharacterBuff {
  buffId: string;
  buffType: string;
  nameFr: string;
}

export interface CharacterSkill {
  name: string;
  description: string;
  category: string;
  weaponType: string;
  cooldown: number;
  damagePercent: string;
  hitCount: number;
  iconUrl: string;
  buffs: CharacterBuff[];
}

export interface AdventureSkill {
  name: string;
  description: string;
}

export interface WeaponSlot {
  weapon: string;
  element: string;
  role: string;
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

export interface CharacterStatsRaw {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface CharacterData {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  rarity: string;
  element: string;
  role: string;
  imageUrl: string;
  statsRaw: CharacterStatsRaw;
  stats: CharacterStats;
  weaponSlots: WeaponSlot[];
  adventureSkill: AdventureSkill[];
  skills: CharacterSkill[];
  url: string;
}
