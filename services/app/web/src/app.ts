// Routes. The store is the home page (search and filters in the address) and /listing/<id>; /publish is the form that
// opens a pull request. Everything else is the site around it: SEO files, icons, the catalog API and MCP.
import { Hono } from "hono";
import { ASSETS } from "./assets.generated";
import { ENTRIES, findEntry, search } from "./catalog";
import { PORTFOLIO_JS, PUBLISH_JS, SIGNIN_JS } from "./client";
import {
	clientIp,
	type ProxyMode,
	RateLimiter,
	securityHeaders,
} from "./guard";
import { handleMcp } from "./mcp";
import {
	aboutPage,
	homePage,
	labPage,
	listingPage,
	notFoundPage,
	publishPage,
	ratePage,
} from "./pages";
import { cleanName, meString, parseMe, portfolioMarkdown } from "./portfolio";
import {
	ICONS,
	llmsTxt,
	robotsTxt,
	securityTxt,
	sitemapXml,
	webManifest,
} from "./seo";
import { SITE } from "./site";
import { issueUrl, readAnswer } from "./umux";
import {
	askPage,
	compassPage,
	journeysPage,
	portfolioPage,
	radarPage,
	rolesPage,
	skillsPage,
} from "./viewpages";

export interface AppOptions {
	/** The address people use, ending in a slash. Without it, each request's own address (see baseOf). */
	publicUrl?: string;
	proxy?: ProxyMode;
	/** API and MCP calls per client per minute. */
	callsPerMinute?: number;
	/** The date sitemap.xml gives as lastmod: when this build started. */
	builtAt?: Date;
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
		for (const [k, v] of Object.entries(securityHeaders()))
			if (!c.res.headers.has(k)) c.res.headers.set(k, v);
	});

	app.get("/health", (c) =>
		c.json({ status: "ok", service: SITE.name.toLowerCase() }),
	);
	app.get("/ready", (c) => c.json({ ready: true }));

	// Pages
	app.get("/", (c) =>
		c.html(
			homePage(baseOf(c), {
				q: (c.req.query("q") ?? "").slice(0, 100),
				kind: c.req.query("kind"),
				group: c.req.query("group"),
				mcp: c.req.query("mcp") === "1",
				ring: c.req.query("ring"),
				check: c.req.query("check"),
				page: Number(c.req.query("page")) || 1,
			}),
		),
	);
	app.get("/about", (c) => c.html(aboutPage(baseOf(c))));
	app.get("/lab", (c) => c.html(labPage(baseOf(c), c.req.query("kind"))));
	app.get("/compass", (c) =>
		c.html(compassPage(baseOf(c), c.req.query("family"))),
	);
	app.get("/radar", (c) => c.html(radarPage(baseOf(c), c.req.query("family"))));
	app.get("/journeys", (c) =>
		c.html(journeysPage(baseOf(c), c.req.query("track"))),
	);
	app.get("/roles", (c) =>
		c.html(
			rolesPage(
				baseOf(c),
				c.req.query("group"),
				c.req.query("know") ?? c.req.query("q"),
			),
		),
	);
	app.get("/skills", (c) =>
		c.html(
			skillsPage(
				baseOf(c),
				c.req.query("cat"),
				Number(c.req.query("page")) || 1,
			),
		),
	);
	app.get("/rate", (c) => c.html(ratePage(baseOf(c))));
	app.get("/umux", (c) => {
		const answer = readAnswer(c.req.query("c"), c.req.query("e"));
		if (!answer) return c.html(ratePage(baseOf(c)), 400);
		return c.redirect(
			issueUrl(SITE.repo, answer, c.req.query("note") ?? "", baseOf(c)),
			303,
		);
	});
	app.get("/portfolio", (c) =>
		c.html(
			portfolioPage(baseOf(c), {
				me: c.req.query("me"),
				name: c.req.query("name"),
				family: c.req.query("family"),
			}),
		),
	);
	app.get("/portfolio.md", (c) => {
		const me = parseMe(c.req.query("me"));
		const name = cleanName(c.req.query("name"));
		const link = `${baseOf(c)}/portfolio?me=${encodeURIComponent(meString(me))}`;
		return c.body(portfolioMarkdown(me, name, link), 200, {
			"content-type": "text/markdown; charset=utf-8",
			"content-disposition": 'attachment; filename="portfolio.md"',
		});
	});
	app.get("/ask", (c) =>
		c.html(askPage(baseOf(c), (c.req.query("q") ?? "").slice(0, 200))),
	);
	app.get("/publish", (c) => c.html(publishPage(baseOf(c))));
	app.get("/listing/:id", (c) => {
		const entry = findEntry(c.req.param("id"));
		if (!entry) return c.html(notFoundPage(baseOf(c)), 404);
		return c.html(listingPage(baseOf(c), entry));
	});
	for (const [path, body] of [
		["/signin.js", SIGNIN_JS],
		["/publish.js", PUBLISH_JS],
		["/portfolio.js", PORTFOLIO_JS],
	] as const)
		app.get(path, (c) =>
			c.body(body, 200, {
				"content-type": "text/javascript; charset=utf-8",
				"cache-control": "public, max-age=300",
			}),
		);

	// For search engines and AI assistants
	app.get("/robots.txt", (c) => c.text(robotsTxt(baseOf(c))));
	app.get("/sitemap.xml", (c) => {
		const paths = [
			"",
			"about",
			"publish",
			"lab",
			"compass",
			"radar",
			"journeys",
			"roles",
			"skills",
			"ask",
			"portfolio",
			...ENTRIES.map((e) => `listing/${e.id}`),
		];
		return c.body(sitemapXml(baseOf(c), paths, lastmod), 200, {
			"content-type": "application/xml; charset=utf-8",
		});
	});
	app.get("/llms.txt", (c) =>
		c.text(
			llmsTxt(baseOf(c), [
				{
					name: "The store",
					path: "",
					note: `${ENTRIES.length} dev tools, agent skills and apps; search with ?q=`,
				},
				{
					name: "Catalog API",
					path: "api/tools",
					note: "search the catalog as JSON: ?q=, kind=, group=, mcp=1, page=",
				},
				{
					name: "MCP server",
					path: "mcp",
					note: "Streamable HTTP, tools search_store and get_listing",
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
	app.get("/api/tools", (c) => {
		const blocked = tooMany(c);
		if (blocked) return blocked;
		const r = search({
			q: c.req.query("q"),
			kind: c.req.query("kind"),
			group: c.req.query("group"),
			mcp: c.req.query("mcp") === "1",
			ring: c.req.query("ring"),
			check: c.req.query("check"),
			page: Number(c.req.query("page")) || 1,
		});
		return c.json(r);
	});
	app.get("/api/tools/:id", (c) => {
		const blocked = tooMany(c);
		if (blocked) return blocked;
		const entry = findEntry(c.req.param("id"));
		return entry ? c.json(entry) : c.json({ error: "No such listing." }, 404);
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
