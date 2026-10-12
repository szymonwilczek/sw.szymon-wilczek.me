// What I'm listening to, for the record player on /engawa.
//   GET /now   {playing, track, artists, album, art, url, at?, progress?, duration?}
//              or {playing: false} with nothing else when there is nothing to tell
//
// Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
// (the last from `npm run spotify-token`)

export interface NowEnv {
  ORIGINS: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
}

interface Track {
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number }[] };
  external_urls: { spotify: string };
  duration_ms: number;
}

const TTL = 30;
let token: { value: string; until: number } | null = null;

// access token lasts an hour
async function access(env: NowEnv): Promise<string> {
  if (token && token.until > Date.now()) return token.value;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN!,
    }),
  });
  if (!res.ok) throw new Error(`spotify token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
  return token.value;
}

const spotify = async (env: NowEnv, path: string) =>
  fetch("https://api.spotify.com/v1" + path, {
    headers: { authorization: `Bearer ${await access(env)}` },
  });

// only what the card shows
function shown(t: Track) {
  const art = [...t.album.images].sort((a, b) => a.width - b.width).find((i) => i.width >= 200);
  return {
    track: t.name,
    artists: t.artists.map((a) => a.name),
    album: t.album.name,
    art: art?.url ?? t.album.images[0]?.url ?? null,
    url: t.external_urls.spotify,
    duration: t.duration_ms,
  };
}

async function look(env: NowEnv) {
  // playing now, and a song
  const cur = await spotify(env, "/me/player/currently-playing");
  if (cur.status === 200) {
    const j = (await cur.json()) as {
      is_playing: boolean;
      progress_ms: number;
      item: Track | null;
    };
    if (j.is_playing && j.item) return { playing: true, ...shown(j.item), progress: j.progress_ms };
  }
  // otherwise the last one played to the end
  const rec = await spotify(env, "/me/player/recently-played?limit=1");
  if (rec.ok) {
    const j = (await rec.json()) as { items: { track: Track; played_at: string }[] };
    const last = j.items[0];
    if (last) return { playing: false, ...shown(last.track), at: last.played_at };
  }
  return { playing: false };
}

export async function now(req: Request, env: NowEnv, ctx: ExecutionContext): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const allowed = env.ORIGINS.split(",").map((s) => s.trim());
  const cors: Record<string, string> = allowed.includes(origin)
    ? { "access-control-allow-origin": origin, vary: "origin" }
    : {};
  if (req.method !== "GET") return new Response("GET only", { status: 405, headers: cors });
  if (!env.SPOTIFY_REFRESH_TOKEN) return json({ playing: false }, cors, 3600);

  // one cached answer for every origin
  const cache = caches.default;
  const key = new Request(new URL("/now", req.url).toString());
  const hit = await cache.match(key);
  if (hit)
    return new Response(hit.body, { headers: { ...Object.fromEntries(hit.headers), ...cors } });
  let body: object;
  try {
    body = await look(env);
  } catch (e) {
    console.error(e);
    body = { playing: false };
  }
  ctx.waitUntil(cache.put(key, json(body, {}, TTL)));
  return json(body, cors, TTL);
}

const json = (body: object, headers: Record<string, string>, ttl: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${ttl}`,
      ...headers,
    },
  });
