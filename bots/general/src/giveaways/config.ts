// Configuration giveaway lue depuis l'environnement (chargé au démarrage via --env-file).

// Salon où les gagnants reçoivent un accès + un message. Si absent, la feature est désactivée.
export const GIVEAWAY_WINNERS_CHANNEL_ID = process.env.CHANNEL_GIVEAWAY_WINNERS || undefined;

// Rôle pingé à l'ouverture d'un giveaway. Si absent, aucun ping.
export const GIVEAWAY_PING_ROLE_ID = process.env.ROLE_NOTIF_GIVEAWAY || undefined;
