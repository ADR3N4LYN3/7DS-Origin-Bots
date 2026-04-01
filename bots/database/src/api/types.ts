export interface CharacterData {
  id: string;
  name: string;
  nameEn: string;
  rarity: string;
  element: string;
  imageUrl: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  skills: {
    name: string;
    description: string;
  }[];
  url: string;
}

export interface ItemData {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  rarity: string;
  imageUrl: string;
  url: string;
}

export interface EquipmentData {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: string;
  stats: Record<string, number>;
  imageUrl: string;
  url: string;
}
