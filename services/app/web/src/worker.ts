// Cloudflare Worker entry: the same Hono app as index.ts, served from the edge instead of a Render container.
// Settings come from [vars] in wrangler.toml (PUBLIC_URL, TRUST_PROXY, CALLS_PER_MINUTE).
import { createApp } from "./app";
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
		ctx: unknown,
	): Response | Promise<Response> {
		app ??= createApp({
			publicUrl: env.PUBLIC_URL || undefined,
			proxy: parseProxyMode(env.TRUST_PROXY),
			callsPerMinute: Number(env.CALLS_PER_MINUTE) || undefined,
		});
		return app.fetch(request, env, ctx as never);
	},
};
