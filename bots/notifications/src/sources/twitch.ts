// Twitch source — uses the Helix API with an app access token (client credentials).
// No public endpoint required: we poll "Get Streams" and detect offline -> online.

export interface TwitchStream {
  userLogin: string;
  userName: string;
  title: string;
  gameName: string;
  thumbnailUrl: string;
  startedAt: string;
}

export interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
  avatar: string;
}

let appToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.value;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: "POST" });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return appToken.value;
}

function headers(clientId: string, token: string): HeadersInit {
  return { "Client-Id": clientId, Authorization: `Bearer ${token}` };
}

/**
 * Return a map (login -> stream) of the channels that are currently live.
 * Batches up to 100 logins per request.
 */
export async function fetchLiveStreams(
  logins: string[],
  clientId: string,
  clientSecret: string,
): Promise<Map<string, TwitchStream>> {
  const live = new Map<string, TwitchStream>();
  if (logins.length === 0) return live;

  const token = await getAppToken(clientId, clientSecret);

  for (let i = 0; i < logins.length; i += 100) {
    const batch = logins.slice(i, i + 100);
    const params = batch.map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
    const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: headers(clientId, token),
    });
    if (!res.ok) {
      console.error(`Twitch streams request failed: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as { data: any[] };
    for (const s of data.data) {
      live.set(s.user_login.toLowerCase(), {
        userLogin: s.user_login,
        userName: s.user_name,
        title: s.title,
        gameName: s.game_name,
        thumbnailUrl: s.thumbnail_url
          .replace("{width}", "1280")
          .replace("{height}", "720"),
        startedAt: s.started_at,
      });
    }
  }
  return live;
}

/**
 * Resolve a login / @login / twitch.tv URL to a real Twitch user (validates existence).
 */
export async function resolveTwitchUser(
  input: string,
  clientId: string,
  clientSecret: string,
): Promise<TwitchUser | null> {
  let login = input.trim();
  const urlMatch = login.match(/twitch\.tv\/([A-Za-z0-9_]+)/);
  if (urlMatch) login = urlMatch[1];
  login = login.replace(/^@/, "").toLowerCase();
  if (!/^[A-Za-z0-9_]{3,25}$/.test(login)) return null;

  const token = await getAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
    headers: headers(clientId, token),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data: any[] };
  const u = data.data?.[0];
  if (!u) return null;
  return { id: u.id, login: u.login, displayName: u.display_name, avatar: u.profile_image_url };
}
