// Routes. The store is /actors/<id>; /console is the one page with a script, and /auth/* relays GitHub's device flow
// for it. Everything else is the site around it: SEO files, icons, the catalog API and MCP.
import { Hono } from "hono";
import { ACTORS, findActor, RUNNER } from "./actors";
import { ASSETS } from "./assets.generated";
import { CONSOLE_JS } from "./console";
import {
	clientIp,
	type ProxyMode,
	RateLimiter,
	securityHeaders,
} from "./guard";
import { handleMcp } from "./mcp";
import {
	aboutPage,
	actorPage,
	consolePage,
	homePage,
	notFoundPage,
} from "./pages";
import {
	ICONS,
	llmsTxt,
	robotsTxt,
	securityTxt,
	sitemapXml,
	webManifest,
} from "./seo";
import { SITE } from "./site";

export interface AppOptions {
	/** The address people use, ending in a slash. Without it, each request's own address (see baseOf). */
	publicUrl?: string;
	proxy?: ProxyMode;
	/** API and MCP calls per client per minute. */
	callsPerMinute?: number;
	/** The date sitemap.xml gives as lastmod: when this build started. */
	builtAt?: Date;
	/** The client id of a GitHub OAuth App with the device flow on. Public by design, not a secret; empty turns sign-in off. */
	clientId?: string;
	/** owner/name of the repository Actors run from; each person's fork of it is where they run. */
	runnerRepo?: string;
	/** Tests replace the network. */
	fetcher?: typeof fetch;
}

/** The icons and the social card from assets.generated.ts, decoded once. tests/seo.test.ts fails on a missing one. */
function loadAssets(): Map<string, { body: Uint8Array; type: string }> {
	const files = new Map<string, { body: Uint8Array; type: string }>();
	for (const name of Object.values(ICONS)) {
		const asset = ASSETS[name];
		if (asset)
			files.set(name, {
				body: Buffer.from(asset.base64, "base64"),
				type: asset.type,
			});
	}
	return files;
}

export function createApp(options: AppOptions = {}) {
	const proxy = options.proxy ?? "none";
	const limit = new RateLimiter(options.callsPerMinute ?? 120, 60 * 1000);
	const lastmod = (options.builtAt ?? new Date()).toISOString().slice(0, 10);
	const files = loadAssets();
	const clientId = options.clientId ?? "";
	const runnerRepo =
		options.runnerRepo ?? new URL(SITE.repo).pathname.replace(/^\/|\/$/g, "");
	const doFetch = options.fetcher ?? fetch;
	const app = new Hono();

	/**
	 * The site address without the trailing slash: publicUrl when set (online), else this request's own origin and the
	 * prefix a proxy stripped (X-Forwarded-Prefix, /api/web behind Flisk's local proxy).
	 */
	const baseOf = (c: {
		req: { url: string; header: (name: string) => string | undefined };
	}) => {
		if (options.publicUrl) return options.publicUrl.replace(/\/$/, "");
		const prefix = c.req.header("x-forwarded-prefix") ?? "";
		const url = new URL(c.req.url);
		const proto =
			c.req.header("x-forwarded-proto") ?? url.protocol.replace(":", "");
		const host = c.req.header("x-forwarded-host") ?? url.host;
		return `${proto}://${host}${/^(\/[\w.-]+)+$/.test(prefix) ? prefix : ""}`;
	};

	const limited = (c: { req: { raw: Request }; env: unknown }) => {
		const env = c.env as
			| { requestIP?: (r: Request) => { address: string } | null }
			| undefined;
		return limit.hit(
			clientIp(c.req.raw.headers, env?.requestIP?.(c.req.raw)?.address, proxy),
		);
	};

	app.use("*", async (c, next) => {
		await next();
		const withScript = new URL(c.req.url).pathname.endsWith("/console");
		for (const [k, v] of Object.entries(securityHeaders(withScript)))
			if (!c.res.headers.has(k)) c.res.headers.set(k, v);
	});

	app.get("/health", (c) =>
		c.json({ status: "ok", service: SITE.name.toLowerCase() }),
	);
	app.get("/ready", (c) => c.json({ ready: true }));

	// Pages
	app.get("/", (c) => c.html(homePage(baseOf(c))));
	app.get("/about", (c) => c.html(aboutPage(baseOf(c))));
	app.get("/actors/:id", (c) => {
		const actor = findActor(c.req.param("id"));
		if (!actor) return c.html(notFoundPage(baseOf(c)), 404);
		return c.html(actorPage(baseOf(c), actor));
	});
	app.get("/console", (c) =>
		c.html(consolePage(baseOf(c), { clientId, repo: runnerRepo, ...RUNNER })),
	);
	app.get("/console.js", (c) =>
		c.body(CONSOLE_JS, 200, {
			"content-type": "text/javascript; charset=utf-8",
			"cache-control": "public, max-age=300",
		}),
	);

	// For search engines and AI assistants
	app.get("/robots.txt", (c) => c.text(robotsTxt(baseOf(c))));
	app.get("/sitemap.xml", (c) => {
		const paths = ["", "about", ...ACTORS.map((a) => `actors/${a.id}`)];
		return c.body(sitemapXml(baseOf(c), paths, lastmod), 200, {
			"content-type": "application/xml; charset=utf-8",
		});
	});
	app.get("/llms.txt", (c) =>
		c.text(
			llmsTxt(baseOf(c), [
				{
					name: "Actor store",
					path: "",
					note: `${ACTORS.length} Actors that run in your own GitHub Actions`,
				},
				{
					name: "Catalog API",
					path: "api/actors",
					note: "every Actor with its inputs, as JSON",
				},
				{
					name: "MCP server",
					path: "mcp",
					note: "Streamable HTTP, tools list_actors and get_actor",
				},
				{
					name: "About and FAQ",
					path: "about",
					note: "what it does and stores",
				},
			]),
		),
	);
	app.get("/site.webmanifest", (c) =>
		c.body(webManifest(baseOf(c)), 200, {
			"content-type": "application/manifest+json",
		}),
	);
	app.get("/.well-known/security.txt", (c) => c.text(securityTxt(baseOf(c))));
	for (const [name, file] of files)
		app.get(`/${name}`, (c) =>
			c.body(file.body as Uint8Array<ArrayBuffer>, 200, {
				"content-type": file.type,
				"cache-control": "public, max-age=604800",
			}),
		);

	// For code
	const tooMany = (c: Parameters<typeof limited>[0]) => {
		const wait = limited(c);
		return wait > 0
			? new Response(JSON.stringify({ error: "Too many requests." }), {
					status: 429,
					headers: {
						"content-type": "application/json",
						"retry-after": String(wait),
					},
				})
			: undefined;
	};
	app.get("/api/actors", (c) => tooMany(c) ?? c.json({ actors: ACTORS }));
	app.get("/api/actors/:id", (c) => {
		const blocked = tooMany(c);
		if (blocked) return blocked;
		const actor = findActor(c.req.param("id"));
		return actor ? c.json(actor) : c.json({ error: "No such Actor." }, 404);
	});

	// Sign-in with GitHub's device flow. github.com sends no CORS headers, so the browser asks us to relay two form
	// posts. Nothing is kept: the client id is public and the token goes straight back to the browser.
	const github = async (path: string, form: Record<string, string>) => {
		const res = await doFetch(`https://github.com/login/${path}`, {
			method: "POST",
			headers: {
				accept: "application/json",
				"content-type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(form),
			signal: AbortSignal.timeout(10_000),
		});
		return { status: res.ok ? 200 : 502, body: await res.json() };
	};
	app.post("/auth/device", async (c) => {
		const blocked = tooMany(c);
		if (blocked) return blocked;
		if (!clientId)
			return c.json(
				{ error: "Sign-in is not set up: GITHUB_CLIENT_ID is empty." },
				503,
			);
		const r = await github("device/code", {
			client_id: clientId,
			scope: "public_repo workflow",
		});
		return c.json(r.body, r.status as 200);
	});
	app.post("/auth/token", async (c) => {
		const blocked = tooMany(c);
		if (blocked) return blocked;
		if (!clientId) return c.json({ error: "Sign-in is not set up." }, 503);
		const body = (await c.req.json().catch(() => ({}))) as {
			device_code?: unknown;
		};
		const code = String(body.device_code ?? "");
		if (!/^[\w-]{10,200}$/.test(code))
			return c.json({ error: "device_code is missing or malformed." }, 400);
		const r = await github("oauth/access_token", {
			client_id: clientId,
			device_code: code,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		});
		return c.json(r.body, r.status as 200);
	});
	app.get("/mcp", (c) =>
		c.text("Send MCP requests with POST.", 405, { allow: "POST" }),
	);
	app.post("/mcp", async (c) => {
		const wait = limited(c);
		if (wait > 0)
			return c.json(
				{
					jsonrpc: "2.0",
					id: null,
					error: { code: -32000, message: "Too many requests." },
				},
				429,
			);
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{
					jsonrpc: "2.0",
					id: null,
					error: { code: -32700, message: "Parse error" },
				},
				400,
			);
		}
		const answer = await handleMcp(body);
		return answer === undefined ? c.body(null, 202) : c.json(answer);
	});

	app.notFound((c) => c.html(notFoundPage(baseOf(c)), 404));
	return app;
}
