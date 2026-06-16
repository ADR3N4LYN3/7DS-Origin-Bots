# Bot Database — contrat API

Le bot `7ds-database` (commandes `/character` et `/pet`) consomme l'API du site
`7dsorigin.app`. Ce document décrit **ce que le bot attend aujourd'hui** et sert de
checklist pour la mise à jour quand l'API évolue.

> ⚠️ Au 2026-06-15 l'API renvoie `404` sur `/api/bot/*` (clé à refaire + API site à
> remettre en service). Les types ci-dessous reflètent l'**ancien** contrat ; à
> confirmer/mettre à jour via le prompt en bas.

## Config (`.env`)

```
API_BASE_URL=https://7dsorigin.app/api/bot   # base, sans slash final
BOT_API_KEY=...                              # envoyé en header x-api-key
```

## Endpoints attendus

| Méthode | Chemin | Query | Retour |
|--------|--------|-------|--------|
| GET | `/characters` | `lang`, `search` | `CharacterSearchResult[]` |
| GET | `/characters/{slug}` | `lang` | `CharacterData` |
| GET | `/pets` | `lang`, `search` | `PetSearchResult[]` |
| GET | `/pets/{slug}` | `lang` | `PetData` |

- Auth : header `x-api-key: <BOT_API_KEY>`.
- `lang` ∈ `fr | en | es | de | pt` (le bot charge `fr` par défaut puis les autres à la demande).
- `search` : filtre de recherche (autocomplete), ≤ 25 résultats côté bot.
- Codes gérés : `401/403` (clé), `404` (introuvable), `429` (rate limit), timeout 10 s.

## Formes JSON

La forme exacte des objets est décrite dans [`src/api/types.ts`](src/api/types.ts)
(`CharacterData`, `CharacterSkill`, `PetData`, `PetSkill`, `PetCaptureData`, …).
Les champs réellement affichés par les embeds :

- **Character** : `name`, `nameEn`, `rarity`, `element`/`elementKey`, `role`,
  `imageUrl`, `bannerUrl`, `url`, `statsLevel`, `stats` (hp/atk/def/spd/critRate/
  critDamage/accuracy/block/critResist), `weaponSlots[]`, `adventureSkill[]`,
  `skills[]` (groupés par `weaponTypeKey`, avec `category`, `damagePercent`,
  `hitCount`, `cooldown`, `buffs[]`).
- **Pet** : `name`, `nameEn`, `rarity`, `petType`/`petTypeKey`, `obtainMethod`,
  `autolootType`, `mountable`, `imageUrl`, `url`, `speeds`, `feedItem`,
  `obtainSources[]`, `captureData` (difficulty/baseRate/resistance/potions[]),
  `activeSkills[]`, `passiveSkill`.

---

## 📋 Prompt à me redonner demain (copier-coller)

> Salut, je remets l'API du bot database en service. Voici les **routes et formats à
> jour** pour que tu remappes `src/api/client.ts` et `src/api/types.ts` :
>
> 1. **Base URL** : `…` (et le header d'auth si différent de `x-api-key`)
> 2. **Recherche personnages** : `GET …` — query params : `…` — exemple de réponse JSON : `…`
> 3. **Détail personnage** : `GET …` — exemple de réponse JSON (1 perso complet) : `…`
> 4. **Recherche familiers** : `GET …` — query params : `…` — exemple JSON : `…`
> 5. **Détail familier** : `GET …` — exemple JSON (1 familier complet) : `…`
> 6. Champs **ajoutés / renommés / supprimés** vs l'ancien contrat (voir `types.ts`) : `…`
> 7. Nouvelle clé `BOT_API_KEY` : (je la mets dans `.env`, ne pas commit)
>
> Mets à jour les types, le client, et les embeds si de nouveaux champs valent le coup
> d'être affichés. Garde le chargement paresseux par langue et le style d'embed premium actuel.

Le plus simple : colle 1 réponse JSON complète par endpoint (un `curl` réel), je
déduis la forme exacte et j'ajuste tout.
