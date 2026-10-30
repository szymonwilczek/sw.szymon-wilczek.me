# 受 roji-inbox

My inbox for pieces made in the `/roji` workshop: a Cloudflare Worker with
one D1 table. A guest's finished piece is posted here with the stone's key
as proof it came through the workshop. It waits until I approve it from
Emacs (`emacs/chashitsu-moderate.el`), which adds it to `src/data/pieces.json`
and commits; the next build puts it on the shelf.

The Worker shares `src/utils/tea/pottery.ts` and `key.ts` with the site,
so a piece is checked by the same `clean()` on both sides.

## Setting it up

Maybe you want something like this for yourself. Sure, go ahead:

Once, from this directory, with a Cloudflare account:

```sh
npx wrangler login
npx wrangler d1 create roji  # paste the database_id it prints into wrangler.toml
npx wrangler d1 execute roji --remote --file schema.sql
```

The key. If `src/utils/tea/key.ts` still has `KEY_HASH = ""`, make one
first from the repository root; this prints the line for `key.ts`:

```sh
npm run roji-key -- "the answer to the cipher"
```

Then give the Worker the same hash, and a token for the host:

```sh
npx wrangler secret put KEY_HASH      # the hash alone, without quotes
openssl rand -hex 24                  # a token; keep it for the next two steps
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

`deploy` prints the Worker's address, e.g.
`https://roji-inbox.<account>.workers.dev`. Put it in
`src/utils/tea/inbox.ts` as `WORKER_URL` and rebuild the site. Until then
pieces stay with the guest, on their own shelf, marked 仮.

If the site moves, change `ORIGINS` in `wrangler.toml`: only those pages may
post pieces.

## Emacs

The token goes into `~/.authinfo.gpg`, one line, with the Worker's host:

```
machine roji-inbox.<account>.workers.dev login roji password <ADMIN_TOKEN>
```

and in `init.el`:

```elisp
(load "~/Dokumenty/GitHub/sw.szymon-wilczek.me/emacs/chashitsu-moderate.el")
(setq chashitsu-inbox-url "https://roji-inbox.<account>.workers.dev"
      chashitsu-repo "~/Dokumenty/GitHub/sw.szymon-wilczek.me/")
(chashitsu-mode-line-mode 1)          ; 陶 N in the mode line while pieces wait
```

`M-x chashitsu-moderate` lists the waiting pieces with their pictures:
`a` approves (adds to `pieces.json` and commits it), `r` rejects, `RET`
shows one large with its card, `g` asks again. The shelf changes with
the next deploy of the site.

## Trying it locally

```sh
npx wrangler d1 execute roji --local --file schema.sql
printf 'KEY_HASH="..."\nADMIN_TOKEN="tok"\n' > .dev.vars
npx wrangler dev                      # http://localhost:8787
```

and set `WORKER_URL` to `http://localhost:8787` while the site runs on
`localhost:4321`.

## What it keeps

The cleaned piece, when it came, its state, and a salted hash of the
sender's address, used only to let one guest send at most five pieces an
hour. Rejected pieces are deleted. At most 200 can wait at once.

## Tones

The previews for Emacs use fixed colours, since librsvg knows neither
`var()` nor `color-mix()`. They come from `src/tones.json`, taken from the
light theme with `tones.console.js`.
