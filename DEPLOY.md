# Deploy on Render (free)

One Render web service on the free plan, from [`render.yaml`](render.yaml) and the root [`Dockerfile`](Dockerfile).
Nothing to sign up for besides Render: no database, no keys.

## 1. Create the service

1. https://dashboard.render.com → **New → Blueprint** → `flisk-sh/flisk-actors`, branch `main`.
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
curl -s https://flisk-actors.onrender.com/ready
curl -s https://flisk-actors.onrender.com/robots.txt
curl -s 'https://flisk-actors.onrender.com/api/contrast?fg=767676&bg=ffffff'
curl -s -X POST https://flisk-actors.onrender.com/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 4. Tell search engines

- Google Search Console and Bing Webmaster Tools: add the domain, submit `/sitemap.xml`.
- Paste a result address into https://www.opengraph.xyz and the Rich Results Test to see the card and the JSON-LD.

## 4. Turn on GitHub sign-in (once)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App** (create it under the `flisk-sh` org).
   Homepage URL: your site. Callback URL: the same (the device flow does not use it).
2. Tick **Enable Device Flow**. Save.
3. Copy the **Client ID** (it is public; do not generate a client secret) into Render as `GITHUB_CLIENT_ID`.
