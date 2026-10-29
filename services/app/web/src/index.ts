// Settings (all optional):
//   PORT              where to listen (4000 under Flisk, 10000 on Render)
//   PUBLIC_URL        the address people use, for canonical links, Open Graph and the sitemap; without it, each
//                     request's own address and the prefix a proxy stripped (X-Forwarded-Prefix, /api/web under
//                     `flisk up`)
//   TRUST_PROXY       none | last-forwarded (Render) | cloudflare: which header names the client, for rate limits
//   CALLS_PER_MINUTE  API and MCP calls per client address per minute (120)
//   GITHUB_CLIENT_ID  client id of a GitHub OAuth App with "Enable Device Flow" on. Public, not a secret; without it
//                     the console cannot sign anyone in
//   RUNNER_REPO       owner/name that Tools are forked from (default: the repo in site.ts)
import { createApp } from "./app";
import { parseProxyMode } from "./guard";
import { SITE } from "./site";

const port = Number(process.env.PORT) || 4000;
const app = createApp({
	publicUrl: process.env.PUBLIC_URL || undefined,
	proxy: parseProxyMode(process.env.TRUST_PROXY),
	callsPerMinute: Number(process.env.CALLS_PER_MINUTE) || undefined,
	clientId: process.env.GITHUB_CLIENT_ID || undefined,
	runnerRepo: process.env.RUNNER_REPO || undefined,
});

console.log(`${SITE.name.toLowerCase()} listening on http://localhost:${port}`);

export default { port, fetch: app.fetch, idleTimeout: 30 };
