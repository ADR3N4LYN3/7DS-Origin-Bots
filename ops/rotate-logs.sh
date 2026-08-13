#!/bin/sh
# Rotation des logs PM2, sans dépendance.
#
# Remplace le module `pm2-logrotate`, retiré le 2026-08-13 pour deux raisons :
#
#   1. Il tirait 108 paquets npm pour faire tourner des fichiers texte, sur une
#      machine qui n'a volontairement même pas npm (node + pnpm seulement).
#      `pm2 install` échouait d'ailleurs faute de npm.
#   2. Son option `compress` est morte en 3.0.0 : pmx passe la config dans
#      `Autocast`, qui transforme la chaîne "true" en booléen `true`, et le
#      `parseBool` du module ne teste QUE les chaînes 'true'/'false' — un
#      booléen retombe donc sur son défaut `false`. Vérifié en lisant les deux
#      sources et en mesurant trois rotations : aucune archive compressée.
#
# Ce script tourne par cron. Il ne connaît pas PM2 : il agit sur les fichiers.
#
# ── Pourquoi copier-puis-vider, et non renommer ────────────────────────────
# Les processus PM2 gardent leur descripteur de fichier ouvert et n'en rouvrent
# pas un après un `mv`. Renommer le fichier ferait écrire le bot dans un fichier
# devenu invisible, et le log actif resterait vide pour toujours. On copie donc
# le contenu, puis on vide le fichier EN PLACE (`: >`), ce qui préserve l'inode.
#
# Fenêtre acceptée : les lignes écrites entre la copie et le vidage sont perdues.
# Quelques millisecondes sur des bots qui écrivent une ligne par run — le coût
# d'une rotation sans interruption de service.

set -eu

LOG_DIR="${LOG_DIR:-$HOME/.pm2/logs}"
# Au-delà, le fichier est archivé. 10 Mo = le seuil que portait le module.
MAX_BYTES="${MAX_BYTES:-10485760}"
# Archives conservées PAR fichier de log. Au-delà, les plus vieilles partent.
RETAIN="${RETAIN:-7}"

[ -d "$LOG_DIR" ] || exit 0

rotated=0

for log in "$LOG_DIR"/*.log; do
  # Le glob ne matche rien -> il reste littéral : on sort au lieu de traiter
  # un fichier nommé « *.log ».
  [ -f "$log" ] || continue

  size=$(wc -c < "$log")
  [ "$size" -gt "$MAX_BYTES" ] || continue

  base=${log%.log}
  stamp=$(date +%Y-%m-%d_%H-%M-%S)
  archive="${base}__${stamp}.log.gz"

  # gzip d'abord, vidage seulement s'il a réussi : une archive tronquée ne doit
  # jamais coûter le log qu'elle était censée sauver.
  if gzip -c "$log" > "$archive"; then
    : > "$log"
    rotated=$((rotated + 1))
    echo "$(date -Iseconds) rotated $(basename "$log") -> $(basename "$archive") ($size octets)"
  else
    echo "$(date -Iseconds) ECHEC gzip sur $(basename "$log") — fichier laissé intact" >&2
    rm -f "$archive"
    continue
  fi

  # Rétention, par fichier de log. `ls -t` trie du plus récent au plus vieux ;
  # on supprime tout ce qui dépasse le rang RETAIN.
  count=0
  for old in $(ls -t "${base}__"*.log.gz 2>/dev/null); do
    count=$((count + 1))
    if [ "$count" -gt "$RETAIN" ]; then
      rm -f "$old"
      echo "$(date -Iseconds) purge $(basename "$old")"
    fi
  done
done

[ "$rotated" -eq 0 ] || echo "$(date -Iseconds) $rotated fichier(s) archivé(s)"
exit 0
