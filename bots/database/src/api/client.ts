import type { CharacterData, CharacterSearchResult } from "./types.js";

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "x-api-key": this.apiKey },
    });

    if (res.status === 403) {
      throw new Error("API: clé invalide ou ressource introuvable");
    }
    if (res.status === 429) {
      throw new Error("API: rate limit dépassé");
    }
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async searchCharacters(query: string, lang = "fr"): Promise<CharacterSearchResult[]> {
    const params = new URLSearchParams({ lang });
    if (query) params.set("search", query);
    return this.fetch(`/characters?${params}`);
  }

  async getCharacter(slug: string, lang = "fr"): Promise<CharacterData> {
    return this.fetch(`/characters/${slug}?lang=${lang}`);
  }
}
