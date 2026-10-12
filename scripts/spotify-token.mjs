// Gets the refresh token the Worker's /now needs.
// The app's redirect URI must be exactly
// http://127.0.0.1:8888/callback (Spotify takes no 'localhost').
//   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=... npm run spotify-token
import http from "node:http";
import crypto from "node:crypto";

const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret) {
  console.error("usage: SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… npm run spotify-token");
  process.exit(1);
}
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-recently-played";
const state = crypto.randomBytes(12).toString("hex");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    res.writeHead(400).end("no code, or not the state this script sent");
    return;
  }
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: url.searchParams.get("code"),
      redirect_uri: REDIRECT,
    }),
  });
  const j = await r.json();
  if (!j.refresh_token) {
    res.writeHead(500).end("Spotify said no; see the terminal");
    console.error(j);
  } else {
    res.end("done. the token is in the terminal; this tab can be closed.");
    console.log("\nThe refresh token, for the Worker (from worker/):\n");
    console.log("  npx wrangler secret put SPOTIFY_REFRESH_TOKEN\n");
    console.log(j.refresh_token + "\n");
  }
  server.close();
});

server.listen(8888, "127.0.0.1", () => {
  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.search = new URLSearchParams({
    response_type: "code",
    client_id: id,
    scope: SCOPES,
    redirect_uri: REDIRECT,
    state,
  }).toString();
  console.log("Open this, log in and agree:\n\n" + auth + "\n");
});
