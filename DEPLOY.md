# Deploy on Render (free)

One Render web service on the free plan, from [`render.yaml`](render.yaml) and the root [`Dockerfile`](Dockerfile).
Nothing to sign up for besides Render: no database, no keys.

## 1. Create the service

1. https://dashboard.render.com → **New → Blueprint** → `flisk-sh/flisk-tools`, branch `main`.
2. Render lists one service on the **Free** plan. Apply.
3. Set `PUBLIC_URL` to the address it got (`https://<name>.onrender.com/`) or to your own domain.

The free plan sleeps after 15 minutes without traffic and takes about a minute to wake. On launch day, upgrade to
Starter for the day, or keep it awake.

## 2. Your own domain (optional)

`bun run rename --domain …` uncomments `domains` in `render.yaml` and sets `PUBLIC_URL`. Then:

1. Render → the service → **Settings → Custom Domains** shows the CNAME target (`<service>.onrender.com`).
2. Your DNS (Cloudflare: **DNS → Add record**): `CNAME`, the subdomain, that target, proxy **DNS only**.
3. Wait for Render to issue the certificate.

Without a payment method on file, Render allows two custom domains per workspace; the Blueprint sync fails on a
third. If you put Cloudflare's proxy in front instead, set `TRUST_PROXY=cloudflare` and accept traffic from
Cloudflare only.

## 3. Check it

```bash
curl -s https://tools.flisk.si/ready
curl -s https://tools.flisk.si/robots.txt
curl -s 'https://tools.flisk.si/api/tools'
curl -s -X POST https://tools.flisk.si/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 4. Tell search engines

- Google Search Console and Bing Webmaster Tools: add the domain, submit `/sitemap.xml`.
- Paste a result address into https://www.opengraph.xyz and the Rich Results Test to see the card and the JSON-LD.

## 4. Turn on GitHub sign-in (once)

Sign-in is the one the DevEx Roadmap and Pages already use: **publish.flisk.si**. It has its own GitHub OAuth App and
keeps no token, so this site needs no OAuth App, no client id and no secret. It only has to be told that this site may
be sent visitors back:

1. In `flisk-sh/pages`, open `services/app/publish/wrangler.toml` and add this site to `ALLOWED_ORIGINS`
   (comma-separated), for example `https://tools.flisk.si`.
2. Deploy the worker: `cd services/app/publish && bunx wrangler@4 deploy`.

Until then, search, browsing and the API work; the "Sign in with GitHub" button shows an error page from publish.flisk.si.
