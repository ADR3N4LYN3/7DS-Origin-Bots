import { Router, type Request, type Response, type IRouter } from "express";
import { type Client, type TextChannel } from "discord.js";
import { verifySignature } from "../utils/hmac.js";
import { buildNewsEmbed } from "../embeds/news.js";

interface NewsPublishedPayload {
  id: number;
  title: string;
  content?: string | null;
  category: string;
  lang: string;
  url: string;
  imageUrl?: string | null;
  publishedAt: string;
}

function isValidPayload(body: unknown): body is NewsPublishedPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.id === "number" &&
    typeof b.title === "string" &&
    typeof b.category === "string" &&
    typeof b.lang === "string" &&
    typeof b.url === "string" &&
    typeof b.publishedAt === "string"
  );
}

export function createNewsRouter(client: Client, channelId: string, secret: string): IRouter {
  const router = Router();

  router.post("/webhook/news-published", async (req: Request, res: Response) => {
    const signature = req.headers["x-signature"] as string | undefined;
    if (!signature) {
      res.status(401).json({ error: "Missing x-signature header" });
      return;
    }

    const rawBody = (req as Request & { rawBody: Buffer }).rawBody;
    if (!verifySignature(rawBody, signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    if (!isValidPayload(req.body)) {
      res.status(400).json({ error: "Invalid payload: id, title, category, lang, url, publishedAt required" });
      return;
    }

    const { embed, row } = buildNewsEmbed(req.body);

    try {
      const channel = (await client.channels.fetch(channelId)) as TextChannel | null;
      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        res.status(500).json({ error: "Discord channel not found" });
        return;
      }

      await channel.send({ embeds: [embed], components: [row] });
      console.log(`News #${req.body.id} "${req.body.title}" posted to #${channel.name}`);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Failed to send Discord message:", err);
      res.status(500).json({ error: "Failed to post to Discord" });
    }
  });

  return router;
}
