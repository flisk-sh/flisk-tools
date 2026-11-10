# Deploy on Cloudflare Workers

tools.flisk.si is a Cloudflare Worker (`flisk-tools`) running the Hono app in `services/app/web/`. No server, no
database, no keys.

```bash
cd services/app/web && bunx wrangler@4 deploy
```

`wrangler.toml` holds the settings (`PUBLIC_URL`, `TRUST_PROXY`) and attaches the custom domain `tools.flisk.si`;
Cloudflare creates the DNS record, so no record named `tools` may exist beforehand.

## Check it

```bash
curl -s https://tools.flisk.si/ready
curl -s https://tools.flisk.si/robots.txt
curl -s 'https://tools.flisk.si/api/tools'
```

## Sign-in

Sign-in is **publish.flisk.si** (worker in `flisk-sh/pages`, `services/app/publish`). Add `https://tools.flisk.si` to
`ALLOWED_ORIGINS` in its `wrangler.toml` and redeploy it.

## Search engines

Submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
