// Cloudflare Worker entry: the same Hono app as index.ts, served from the edge instead of a Render container.
// Settings come from [vars] in wrangler.toml (PUBLIC_URL, TRUST_PROXY, CALLS_PER_MINUTE).
import { createApp } from "./app";
import { withEdgeCache } from "./edge-cache";
import { parseProxyMode } from "./guard";

interface Env {
	PUBLIC_URL?: string;
	TRUST_PROXY?: string;
	CALLS_PER_MINUTE?: string;
}

let app: ReturnType<typeof createApp> | undefined;

export default {
	fetch(
		request: Request,
		env: Env,
		ctx: { waitUntil(p: Promise<unknown>): void },
	): Promise<Response> {
		app ??= createApp({
			publicUrl: env.PUBLIC_URL || undefined,
			proxy: parseProxyMode(env.TRUST_PROXY),
			callsPerMinute: Number(env.CALLS_PER_MINUTE) || undefined,
		});
		const a = app;
		const cache = (
			globalThis as { caches?: { default?: import("./edge-cache").EdgeCache } }
		).caches?.default;
		return withEdgeCache(
			request,
			(r) => a.fetch(r, env, ctx as never),
			cache,
			(p) => ctx.waitUntil(p),
		);
	},
};
