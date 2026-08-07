# Bot Notifications

Surveille des chaînes YouTube et Twitch, et poste une annonce dans un salon Discord
à chaque nouvelle vidéo ou passage en live.

- **YouTube** — flux RSS public, sans clé API. Sondé toutes les 180 s (`YOUTUBE_POLL_SECONDS`).
- **Twitch** — API Helix, sondée toutes les 60 s (`TWITCH_POLL_SECONDS`). Nécessite
  `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`, sinon les abonnements Twitch sont ignorés
  avec un avertissement dans les logs.

Tout est stocké en fichiers, dans `data/` (au niveau du dossier du bot) :

| Fichier | Contenu |
|---|---|
| `subscriptions.json` | Les chaînes surveillées, leur salon, leur rôle, leurs filtres |
| `state.json` | Ce qui a déjà été annoncé — **ne pas éditer à la main** |

---

## Commandes

Toutes réservées au rôle admin (`DISCORD_ADMIN_ROLE_ID`), toutes les réponses sont éphémères.

### Ajouter une chaîne

```
/notif add plateforme:YouTube chaine:@LeCreateur salon:#notifications role:@Notif
```

`chaine` accepte un lien, un `@handle`, un pseudo ou un ID `UC…`. `role` et `message`
sont facultatifs. Un doublon (même chaîne, même salon) est refusé.

Par défaut **toutes** les vidéos de la chaîne sont postées — voir *Filtres* pour restreindre.

À l'ajout, le flux courant est enregistré comme déjà vu : aucune vidéo existante n'est
annoncée rétroactivement.

### Message personnalisé

L'option `message` de `/notif add` remplace le texte par défaut. Variables disponibles :
`{role}` `{name}` `{title}` `{url}` `{game}` `{login}`.

### Les autres

| Commande | Effet |
|---|---|
| `/notif list` | Toutes les chaînes surveillées, avec leurs filtres |
| `/notif remove notification:X` | Supprime la surveillance (et son état) |
| `/notif test notification:X [salon:#autre]` | Envoie une annonce réelle (dernière vidéo / live en cours) |

Le champ `notification` est en autocomplétion : tape le nom de la chaîne, Discord propose
`📺 LeCreateur → #a1b2c3d4`.

---

## Filtres (YouTube uniquement)

Pour une chaîne qui couvre plusieurs jeux et dont on ne veut qu'une partie des vidéos.

```
/notif filter notification:X inclure:7ds, seven deadly, nanatsu
/notif preview notification:X
```

**Les termes sont cherchés dans le titre ET dans la description.** C'est essentiel :
« SSR Derieri Is BROKEN! 3M Damage Showcase » est une vidéo 7DS qui ne nomme jamais le
jeu dans son titre. Filtrer sur le titre seul ferait perdre la moitié des vidéos.

Règles :

- `inclure` vide → tout passe (comportement par défaut)
- `inclure` renseigné → il faut **au moins un** terme pour que la vidéo soit postée
- `exclure` **gagne toujours**, même si un terme d'inclusion matche
- comparaison insensible à la casse et aux accents
- un filtre ne vaut que pour l'avenir : il ne rattrape rien et ne supprime rien

| Commande | Effet |
|---|---|
| `/notif filter notification:X` *(sans autre option)* | Affiche les filtres actuels |
| `/notif filter notification:X inclure:a, b` | Remplace la liste d'inclusion |
| `/notif filter notification:X exclure:digimon` | Remplace la liste d'exclusion |
| `/notif filter notification:X reset:true` | Retire tout, retour au « tout poster » |

Les termes se séparent par des virgules **ou des retours à la ligne** — coller plusieurs
lignes d'un coup ne colle plus deux termes ensemble. La confirmation les affiche entre
backticks (`` `7ds` · `seven deadly` ``) pour qu'un mauvais découpage se voie.

Twitch refuse la commande : un live n'a pas de description exploitable.

### Prévisualiser

`/notif preview notification:X` rejoue le filtre sur les 15 dernières vidéos du flux :

| Icône | Sens |
|---|---|
| ✅ | serait postée |
| 🚫 | écartée par les mots-clés |
| ♻️ | écartée comme doublon de titre |

Le compteur « Postées » indique ce qui partirait réellement. La règle d'ancienneté n'est
volontairement pas rejouée : appliquée à un historique, elle marquerait tout comme trop
vieux sans rien dire du comportement futur.

---

## Comment les doublons sont évités

> Contexte : jusqu'en août 2026, le bot ne mémorisait qu'**un seul repère** — l'identifiant
> de la dernière vidéo annoncée — et annonçait tout ce qui se trouvait au-dessus dans le
> flux. Or le flux RSS de YouTube réordonne ses entrées et en escamote parfois une
> temporairement. Quand le repère disparaissait, le bot se rabattait sur la vidéo de tête,
> déjà annoncée, et la repostait — puis enregistrait ce repère plus ancien, ce qui relançait
> tout au cycle suivant. Résultat mesuré : 9 vidéos repostées sur 52 annonces en deux mois,
> avec des écarts de 6 minutes à 6 jours.

Quatre garde-fous, tous automatiques et valables pour **toutes** les chaînes :

1. **Historique par abonnement** — les 60 dernières vidéos traitées sont mémorisées
   (identifiant, titre normalisé, date). Une vidéo déjà vue ne peut plus être réannoncée,
   quel que soit le désordre du flux. C'est le garde-fou principal.
2. **Écriture avant envoi** — une vidéo est marquée comme traitée *avant* le message
   Discord. Deux cycles de sondage qui se chevauchent ne peuvent donc pas poster deux fois.
3. **Déduplication par titre** — deux entrées de même titre publiées à moins de 48 h l'une
   de l'autre ne donnent qu'une annonce. Couvre le cas où YouTube expose deux vidéos
   distinctes pour un même live relancé.
4. **Bornes de sécurité** — rien de plus vieux que 7 jours n'est annoncé, et au plus
   3 vidéos par cycle (le reste part au cycle suivant, rien n'est perdu).

Une vidéo écartée par un filtre est quand même marquée comme traitée : sinon elle serait
réexaminée à chaque cycle.

### Amorçage

Un abonnement dont l'historique est absent (nouvel ajout, ou état antérieur à ce système)
enregistre tout le flux courant comme vu, sans rien annoncer :

```
Seeded 15 videos for TapScreen Gaming (no announcement)
```

Conséquence : une vidéo publiée dans la minute qui suit un redémarrage peut être manquée.
C'est le prix à payer pour ne pas déverser 15 annonces d'un coup.

### Vérifier après coup

Chaque décision est tracée :

```
ssh nmwatch "pm2 logs 7ds-notifications --lines 40 --nostream"

TapScreen Gaming: announced — TimeSpace Junction FULL GUIDE!
TapScreen Gaming: skipped (filtered out) — Huge New Update In DIGIMON UP
TapScreen Gaming: skipped (duplicate title) — 7DS Origin 1.8 Live
```

---

## Réglages

Constantes dans le code, à changer seulement en connaissance de cause :

| Réglage | Valeur | Où |
|---|---|---|
| Taille de l'historique | 60 vidéos | `config/storage.ts` — `ANNOUNCED_MAX` |
| Fenêtre de dédup par titre | 48 h | `filter.ts` — `TITLE_DEDUPE_MS` |
| Âge maximum annonçable | 7 jours | `filter.ts` — `MAX_AGE_MS` |
| Annonces par cycle | 3 | `index.ts` — `YT_MAX_PER_CYCLE` |

Variables d'environnement : voir `.env.example`.
