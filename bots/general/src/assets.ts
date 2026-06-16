import { AttachmentBuilder } from "discord.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

// Bannière empaquetée dans le repo (assets/banner.png) — envoyée en pièce jointe
// plutôt qu'en URL pour éviter l'expiration des liens CDN Discord.
// dist/assets.js -> ../assets/banner.png === bots/general/assets/banner.png
const BANNER_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "banner.png");

export const BANNER_FILENAME = "banner.png";
export const BANNER_ATTACHMENT_URL = `attachment://${BANNER_FILENAME}`;

// Renvoie une pièce jointe fraîche pour la bannière, ou null si le fichier manque.
export function bannerFile(): AttachmentBuilder | null {
  if (!existsSync(BANNER_PATH)) return null;
  return new AttachmentBuilder(BANNER_PATH, { name: BANNER_FILENAME });
}
