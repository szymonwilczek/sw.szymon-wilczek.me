// Gets the refresh token the Worker's /now needs.
// The app's redirect URI must be exactly
// http://127.0.0.1:8888/callback (Spotify takes no 'localhost').
//   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=... npm run spotify-token
import http from "node:http";
import crypto from "node:crypto";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientId || !secret) {
  console.error("usage: SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… npm run spotify-token");
  process.exit(1);
}
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-recently-played";
const state = crypto.randomBytes(12).toString("hex");

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, REDIRECT);
  if (url.pathname !== "/callback") return response.writeHead(404).end();
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    response.writeHead(400).end("no code, or not the state this script sent");
    return;
  }
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: url.searchParams.get("code"),
      redirect_uri: REDIRECT,
    }),
  });
  const reply = await tokenResponse.json();
  if (!reply.refresh_token) {
    response.writeHead(500).end("Spotify said no; see the terminal");
    console.error(reply);
  } else {
    response.end("done. the token is in the terminal; this tab can be closed.");
    console.log("\nThe refresh token, for the Worker (from worker/):\n");
    console.log("  npx wrangler secret put SPOTIFY_REFRESH_TOKEN\n");
    console.log(reply.refresh_token + "\n");
  }
  server.close();
});

server.listen(8888, "127.0.0.1", () => {
  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: REDIRECT,
    state,
  }).toString();
  console.log("Open this, log in and agree:\n\n" + auth + "\n");
});
