# Giveaways

Fonctionnalité du bot **general** (qui gère par ailleurs l'accueil, les rôles, les
sondages, les règles et la modération — non couverts ici).

Un giveaway = une carte Discord avec 1 à 3 lots, un compte à rebours, un bouton
« Participer » et un tirage automatique à l'échéance.

Stockage : `data/giveaways.json` (au niveau du dossier du bot).

---

## Commandes

Réservées au rôle admin (`DISCORD_ADMIN_ROLE_ID`), réponses éphémères.

| Commande | Effet |
|---|---|
| `/giveaway start prize1:… duration:… [prize2] [prize3] [channel] [title]` | Lance un giveaway |
| `/giveaway end message_id:…` | Termine en avance et tire les gagnants |
| `/giveaway reroll message_id:… [tier:1\|2\|3]` | Retire un gagnant pour un lot |
| `/giveaway list` | Les giveaways en cours |
| `/giveaway participants message_id:…` | La liste complète **+ un export CSV** |

`duration` : `30s`, `5m`, `2h`, `1d`, `7d` — minimum 30 s, maximum 30 jours.

Le nombre de gagnants est déduit du nombre de lots renseignés.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `ROLE_NOTIF_GIVEAWAY` | Rôle pingé à l'ouverture. Vide = pas de ping |
| `CHANNEL_GIVEAWAY_WINNERS` | Salon privé où les gagnants reçoivent un accès. Vide = désactivé |

Bannière : remplacer `assets/banner.png`, aucune variable à toucher.

---

## Participation

Cliquer sur « Participer » ouvre un formulaire :

| Champ | Obligatoire | Contenu |
|---|---|---|
| **Pseudo en jeu** | oui | Le pseudo exact dans 7DS Origin (2 à 32 caractères) |
| **Pseudo ou UID Lootbar** | non | Pseudo Lootbar, ou UID au format `U1062182404` |

Le champ Lootbar est facultatif : c'est Lootbar qui identifie le gagnant à la livraison.
Une saisie uniquement numérique est lue comme un UID et récupère son `U` ; tout le reste
est conservé tel quel comme pseudo.

Le **pseudo en jeu est le marqueur de complétude** : une participation sans pseudo (cas des
giveaways antérieurs à ce formulaire) rouvre le formulaire au prochain clic.

Un même compte Lootbar ne peut pas être déclaré par deux comptes Discord. Un champ vide
n'est évidemment pas concerné.

### Reclic

Un membre déjà inscrit ne se désinscrit pas par accident : il reçoit un récapitulatif de
ses informations avec deux boutons.

```
✅ Tu participes déjà à ce giveaway.
**Pseudo** `Meliodas`
**Lootbar** `U1062182404`

[✏️ Modifier mes infos]  [🚪 Quitter]
```

### Langues

Le formulaire et toutes les réponses éphémères suivent la **langue Discord du membre** :

| Langue Discord | Affichage |
|---|---|
| Français | FR |
| Espagnol (ES / LATAM) | ES |
| Allemand | DE |
| Tout le reste | EN |

La carte publique, elle, reste en français avec des boutons 🇬🇧 🇪🇸 🇩🇪 qui affichent un
aperçu traduit éphémère.

Pour ajouter une langue : une entrée dans `I18N` (`giveaways/i18n.ts`) et le code dans
`langFromLocale`.

---

## Où apparaissent les informations collectées

| Surface | Pseudo en jeu | Lootbar |
|---|---|---|
| Annonce publique des résultats | en clair | **masqué** (`U******2404`) |
| Reroll (salon public) | en clair | **masqué** |
| Salon des gagnants (privé) | en clair | **en clair** |
| `/giveaway participants` (admin) | en clair | **en clair** + CSV |

Le masquage garde les 4 derniers caractères : assez pour que le gagnant se reconnaisse,
pas assez pour être réutilisable. Un gagnant qui n'a pas renseigné de Lootbar n'affiche
rien de plus en public, et le salon des gagnants l'indique explicitement.

Le CSV joint à `/giveaway participants` contient
`pseudo_en_jeu, lootbar, discord_id, inscrit_le`.

---

## Fin d'un giveaway

À l'échéance (ou sur `/giveaway end`) :

1. la carte passe en gris, son bouton est désactivé ;
2. une annonce de résultats est postée en réponse, mentionnant les gagnants ;
3. chaque gagnant reçoit un accès en lecture/écriture au salon `CHANNEL_GIVEAWAY_WINNERS`,
   avec son pseudo et son Lootbar en clair pour la livraison.

Un `reroll` retire l'accès à l'ancien gagnant et le donne au nouveau.

Les giveaways en cours sont **restaurés au redémarrage** du bot (`Restored N active
giveaways` dans les logs) : une échéance ne se perd pas lors d'un déploiement.
