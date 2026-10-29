# 送 send

Text and files passed between my own devices: a Cloudflare Worker with two
kinds of SQLite-backed Durable Objects.

`/send/` on the site sends the text, a file, or a zip of several with my
password; the Worker files it under five letters and answers with the link,
`send.szymon-wilczek.me/k7xm2`.

What the link gives back:

- text alone: shown as `text/plain`, or downloaded as `k7xm2.org` when it
  was sent as a file with that extension;
- one file: as it is, under its own name; images, video, audio, PDFs and
  plain text open in the browser, everything else downloads;
- several files, or text with files: one `k7xm2.zip`, zipped in the browser
  (stored, not compressed), the text inside as `k7xm2.txt` or `k7xm2.<ext>`.

A send ticked "lock it" carries a second password. Opening the link then
brings up the browser's own Basic Auth prompt (any name, that password);
the password is kept only as a salted hash. The bytes themselves are not
encrypted: the Worker is the lock.

Everything lives one day from the moment it starts. Uploads that never
finish are swept after an hour.

## How it is kept

- `Registry` (one object): every send's name, type, size, lock and upload
  token, and the pool: a send only starts if the account has room for all
  of it. Its alarm is always set for the next send due.
- `Shard` (one per 512 MiB of a send): the bytes, in 2 MiB rows numbered
  across the whole send, so any byte range is a lookup; that is what lets a
  video seek. Each shard's own alarm empties it after the day, too.

The page sends 32 MiB a request (`PUT /:id/:chunk`), with a token it got
from `POST /`; `POST /:id/done` checks every byte is in before the link
opens. The numbers live in `src/utils/send.ts`, shared with the site.

## Setting it up

I don't think anyone will have the same use case as I did, but if anyone
came across lurking in this repository:

Once, from this directory, with a Cloudflare account (the free plan is
enough, no card):

```sh
npx wrangler login
npx wrangler secret put SEND_WORD   # the password typed on /send/
npx wrangler deploy
```

`deploy` makes `send.website.com` the Worker's custom domain
(the zone has to be on the same Cloudflare account) and creates both
Durable Object classes from the `[[migrations]]` block.

The password is only ever a Worker secret: it is never in the repository
and never in the site's build. `/send/` asks for it and, after it fits
once, remembers it in that browser.

To try it locally, without an account:

```sh
npx wrangler dev --local --var SEND_WORD:test
```

## Limits

- 4.5 GB live across all sends (the free plan holds 5 GB of Durable
  Objects); `/send/` shows what is free right now
- 10 MB of text; files up to whatever the pool has room for
- 10 sends started a minute per address, wrong passwords included, and 10
  wrong lock passwords a minute (`[[ratelimits]]`)
- free Durable Objects allow 100 000 rows written a day: about 200 GiB of
  uploads at 2 MiB a row, far more than the pool turns over
