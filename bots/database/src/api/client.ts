import type {
  CharacterData,
  CharacterSearchResult,
  CharacterMastery,
  CharacterCostumes,
  CharacterPotential,
  Item,
  PetData,
  PetSearchResult,
} from "./types.js";

/** Raised on any non-2xx API response, carrying the HTTP status for callers that care. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        headers: { "x-api-key": this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Network failure or timeout — surface a stable message.
      const reason = err instanceof Error && err.name === "TimeoutError" ? "délai dépassé" : "injoignable";
      throw new ApiError(0, `API ${reason}`);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ApiError(res.status, "API: clé invalide ou accès refusé");
    }
    if (res.status === 404) {
      throw new ApiError(404, "API: ressource introuvable");
    }
    if (res.status === 429) {
      throw new ApiError(429, "API: rate limit dépassé");
    }
    if (!res.ok) {
      throw new ApiError(res.status, `API error ${res.status}: ${res.statusText}`);
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

  async getMastery(slug: string, lang = "fr"): Promise<CharacterMastery> {
    return this.fetch(`/characters/${slug}/mastery?lang=${lang}`);
  }

  async getCostumes(slug: string, lang = "fr"): Promise<CharacterCostumes> {
    return this.fetch(`/characters/${slug}/costumes?lang=${lang}`);
  }

  async getPotential(slug: string, lang = "fr"): Promise<CharacterPotential> {
    return this.fetch(`/characters/${slug}/potential?lang=${lang}`);
  }

  async getItems(usage = "mastery", lang = "fr"): Promise<Item[]> {
    return this.fetch(`/items?usage=${usage}&lang=${lang}`);
  }

  async searchPets(query: string, lang = "fr"): Promise<PetSearchResult[]> {
    const params = new URLSearchParams({ lang });
    if (query) params.set("search", query);
    return this.fetch(`/pets?${params}`);
  }

  async getPet(slug: string, lang = "fr"): Promise<PetData> {
    return this.fetch(`/pets/${slug}?lang=${lang}`);
  }
}
