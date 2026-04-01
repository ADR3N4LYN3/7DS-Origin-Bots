import type { CharacterData, ItemData, EquipmentData } from "./types.js";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getCharacters(): Promise<CharacterData[]> {
    return this.fetch("/characters");
  }

  async getCharacter(id: string): Promise<CharacterData> {
    return this.fetch(`/characters/${id}`);
  }

  async searchCharacters(query: string): Promise<CharacterData[]> {
    return this.fetch(`/characters?search=${encodeURIComponent(query)}`);
  }

  async getItems(): Promise<ItemData[]> {
    return this.fetch("/items");
  }

  async getItem(id: string): Promise<ItemData> {
    return this.fetch(`/items/${id}`);
  }

  async getEquipment(): Promise<EquipmentData[]> {
    return this.fetch("/equipment");
  }

  async getEquipmentById(id: string): Promise<EquipmentData> {
    return this.fetch(`/equipment/${id}`);
  }
}
