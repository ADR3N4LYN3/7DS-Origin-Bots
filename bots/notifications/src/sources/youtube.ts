// YouTube source — keyless, based on the public RSS feed of each channel.
// Feed: https://www.youtube.com/feeds/videos.xml?channel_id=UC...

export interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  published: string;
  thumbnail: string;
}

const UC_ID = /UC[\w-]{22}/;

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function feedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * Fetch the latest videos of a channel, newest first.
 */
export async function fetchLatestVideos(channelId: string): Promise<YouTubeVideo[]> {
  const res = await fetch(feedUrl(channelId));
  if (!res.ok) throw new Error(`YouTube feed responded ${res.status} for ${channelId}`);
  const xml = await res.text();

  const videos: YouTubeVideo[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    if (!videoId || title === undefined) continue;
    videos.push({
      videoId,
      title: decodeXml(title),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      published,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return videos;
}

/**
 * Resolve a user-provided value (channel id, channel URL, @handle or custom URL)
 * to a stable channel id + display name. No API key required.
 */
export async function resolveYouTubeChannel(
  input: string,
): Promise<{ channelId: string; name: string } | null> {
  let channelId: string | null = null;

  const fromUrl = input.match(/channel\/(UC[\w-]{22})/);
  const bare = input.trim().match(/^(UC[\w-]{22})$/);
  if (fromUrl) channelId = fromUrl[1];
  else if (bare) channelId = bare[1];

  if (!channelId) {
    // Treat the input as a handle or custom URL and scrape the channel page.
    let url = input.trim();
    if (url.startsWith("@")) url = `https://www.youtube.com/${url}`;
    else if (!/^https?:\/\//.test(url)) url = `https://www.youtube.com/@${url}`;
    try {
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (res.ok) {
        const html = await res.text();
        const m =
          html.match(/"externalId":"(UC[\w-]{22})"/) ||
          html.match(/"channelId":"(UC[\w-]{22})"/) ||
          html.match(/channel\/(UC[\w-]{22})/);
        if (m) channelId = m[1];
      }
    } catch {
      // fall through — handled below
    }
  }

  if (!channelId || !UC_ID.test(channelId)) return null;

  // Pull the display name straight from the feed's top-level <title>.
  const res = await fetch(feedUrl(channelId));
  if (!res.ok) return null;
  const xml = await res.text();
  const nameMatch = xml.match(/<title>([^<]*)<\/title>/);
  const name = nameMatch ? decodeXml(nameMatch[1]) : channelId;
  return { channelId, name };
}
