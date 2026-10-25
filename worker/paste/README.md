# 送 paste

Text passed between my own devices: a Cloudflare Worker with one KV
namespace. `/paste/` on the site sends the text here with my word; the
Worker files it under five letters and answers with the link,
`paste.szymon-wilczek.me/k7xm2`. Opening that link anywhere gives the text
back raw, as `text/plain`. Every paste is put with a one-day
`expirationTtl`, so KV forgets it on its own: nothing to clean, no list,
no logs of what was sent.

The rules (lifetime, size, the id alphabet) live in `src/utils/paste.ts`,
shared with the site.

## Setting it up

I don't think anyone will have the same use case as I did, but if anyone
came across lurking in this repository:

Once, from this directory, with a Cloudflare account:

```sh
npx wrangler login
npx wrangler kv namespace create PASTES   # uncomment the block in wrangler.toml, with this id
npx wrangler secret put PASTE_WORD        # the word typed on /paste/
npx wrangler deploy
```

`deploy` makes `paste.website.com` the Worker's custom domain
(the zone has to be on the same Cloudflare account).

The word is only ever a Worker secret: it is never in the repository and
never in the site's build. `/paste/` asks for it and, after it fits once,
remembers it in that browser.

## Limits

- 65 536 characters a paste, one day each
- 10 writes a minute per address, wrong words included (`[[ratelimits]]`)
- free KV allows 1000 writes and 100 000 reads a day, plenty for one person (me :))
