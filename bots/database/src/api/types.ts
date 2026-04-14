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
