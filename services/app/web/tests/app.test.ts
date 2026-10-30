import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import {
	ENTRIES,
	findEntry,
	groups,
	mcpCommand,
	PAGE_SIZE,
	problem,
	search,
} from "../src/catalog";
import { PUBLISH_JS, SIGNIN_JS } from "../src/client";
import { RateLimiter, TtlCache } from "../src/guard";

const app = createApp({ publicUrl: "https://tool.test/" });
const rpc = (a: ReturnType<typeof createApp>, body: unknown) =>
	a.request("/mcp", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

describe("catalog", () => {
	it("is large, with Flisk's own apps, roadmap tools and agent skills", () => {
		expect(ENTRIES.length).toBeGreaterThan(500);
		for (const kind of ["app", "tool", "skill"])
			expect(ENTRIES.some((e) => e.kind === kind)).toBe(true);
		expect(findEntry("readme-score")?.official).toBe(true);
	});

	it("lists official entries first, then by stars", () => {
		expect(ENTRIES[0].official).toBe(true);
		const rest = ENTRIES.filter((e) => !e.official);
		for (let i = 1; i < rest.length; i++)
			expect(rest[i - 1].stars ?? 0).toBeGreaterThanOrEqual(rest[i].stars ?? 0);
	});

	it("searches by every word, filters by kind and group, and pages", () => {
		const r = search({ q: "docker compose" });
		expect(r.total).toBeGreaterThan(0);
		// Relevance, not popularity: the tool with that name comes first, however many stars others have.
		expect(r.items[0].id).toBe("docker-compose");
		expect(
			search({ kind: "skill" }).items.every((e) => e.kind === "skill"),
		).toBe(true);
		expect(search({}).items).toHaveLength(PAGE_SIZE);
		expect(search({ page: 9999 }).page).toBe(search({}).pages);
		expect(search({ q: "zzzz-no-such-thing" }).total).toBe(0);
		expect(search({ q: "asdfgh" }).total).toBe(0);
		expect(groups("skill")[0].name).toBe("Agent skills");
	});
});

describe("search", () => {
	const top = (q: string, n = 3) =>
		search({ q })
			.items.slice(0, n)
			.map((e) => e.id);

	it("forgives a typo and knows k8s means Kubernetes", () => {
		expect(top("kubernets")).toContain("kubernetes");
		expect(top("k8s", 5)).toContain("kubernetes");
	});

	it("matches some of the words, best match first", () => {
		expect(search({ q: "browser automation", mcp: true }).items[0].id).toBe(
			"playwright-mcp",
		);
		expect(top("claude code")[0]).toBe("claude-code");
	});

	it("searches the roadmap's checks, like works offline with no account", () => {
		const r = search({ q: "offline no account" });
		expect(r.total).toBeGreaterThan(0);
		expect(r.items[0].dx).toContain("offline");
	});

	it("returns nothing for a query that matches nothing real", () => {
		expect(search({ q: "zzzz-no-such-thing" }).total).toBe(0);
	});
});

describe("pages", () => {
	it("serves the home page with a policy that allows only this site's scripts", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);
		const csp = res.headers.get("content-security-policy") ?? "";
		expect(csp).toContain("default-src 'none'");
		expect(csp).toContain("script-src 'self'");
		expect(csp).not.toContain("unsafe-eval");
		const html = await res.text();
		expect(html).toContain("README Score");
		expect(html).toContain('<script src="/signin.js" defer>');
		expect(html).not.toMatch(/<script(?![^>]*(src=|application\/ld\+json))/);
	});

	it("searches from the address, and keeps filtered pages out of the index", async () => {
		const html = await (await app.request("/?q=review&kind=skill")).text();
		expect(html).toContain('<meta name="robots" content="noindex">');
		expect(html).toContain("results for “review”");
		const none = await (await app.request("/?q=zzzz-no-such-thing")).text();
		expect(none).toContain("Nothing matches");
		const home = await (await app.request("/")).text();
		expect(home).toContain('content="index,follow');
	});

	it("escapes what you search for", async () => {
		const html = await (
			await app.request("/?q=%3Cscript%3Ealert(1)%3C/script%3E")
		).text();
		expect(html).not.toContain("<script>alert");
	});

	it("gives each listing a page that opens where it lives, and 404s an unknown one", async () => {
		const html = await (await app.request("/listing/citable")).text();
		expect(html).toContain('href="https://citable.flisk.si"');
		expect(html).toContain("(Flisk)");
		expect((await app.request("/listing/nope")).status).toBe(404);
	});

	it("has a publish page whose form points at this repository", async () => {
		const html = await (await app.request("/publish")).text();
		expect(html).toContain(
			'data-repo="https://github.com/flisk-sh/flisk-tools"',
		);
		expect(html).toContain('<script src="/publish.js" defer>');
	});

	it("builds links under the prefix a proxy stripped, and ignores a hostile one", async () => {
		const local = createApp();
		const html = await (
			await local.request("http://api.tool.localhost/", {
				headers: { "x-forwarded-prefix": "/api/web" },
			})
		).text();
		expect(html).toContain('href="/api/web/publish"');
		expect(html).toContain(
			'<link rel="canonical" href="http://api.tool.localhost/api/web/">',
		);
		const evil = await (
			await local.request("http://api.tool.localhost/", {
				headers: { "x-forwarded-prefix": "//evil.example" },
			})
		).text();
		expect(evil).not.toContain("evil.example");
	});
});

describe("MCP listings", () => {
	it("shows how to add a remote server on the listing, and a badge on the card", async () => {
		const html = await (await app.request("/listing/citable")).text();
		expect(html).toContain(
			"claude mcp add --transport http citable https://citable.flisk.si/mcp",
		);
		expect(html).toContain("<code>check_site</code>");
		const home = await (await app.request("/?q=citable")).text();
		expect(home).toContain('<span class="mcp">MCP</span>');
	});

	it("shows a local server as a command, with its registry name", async () => {
		const html = await (await app.request("/listing/flisk")).text();
		expect(html).toContain("claude mcp add flisk -- flisk mcp");
		expect(html).toContain("io.github.flisk-sh/flisk");
		expect(mcpCommand({ id: "x" })).toBe("");
	});

	it("filters to listings with an MCP server, in the page, the API and the MCP tool", async () => {
		expect(search({ mcp: true }).items.every((e) => e.mcp)).toBe(true);
		expect(search({ mcp: true }).total).toBeGreaterThanOrEqual(5);
		const page = await (await app.request("/?mcp=1")).text();
		expect(page).toContain('<meta name="robots" content="noindex">');
		expect(page).toContain("Citable");
		expect(page).not.toContain("LangGraph");
		const api = (await (await app.request("/api/tools?mcp=1")).json()) as {
			total: number;
		};
		expect(api.total).toBe(search({ mcp: true }).total);
		const r = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 9,
				method: "tools/call",
				params: { name: "search_store", arguments: { mcp: true } },
			})
		).json()) as { result: { content: { text: string }[] } };
		expect(r.result.content[0].text).toContain("MCP server:");
	});

	it("checks the MCP fields of a listing", () => {
		const ok = {
			kind: "app",
			id: "x",
			name: "X",
			tagline: "t",
			description: "d",
			group: "g",
			category: "c",
			url: "https://x.test",
		} as const;
		expect(
			problem({ ...ok, mcp: { transport: "http", url: "https://x.test/mcp" } }),
		).toBeUndefined();
		expect(
			problem({ ...ok, mcp: { transport: "http", url: "http://x.test/mcp" } }),
		).toContain("mcp.url");
		expect(
			problem({ ...ok, mcp: { transport: "stdio", command: "npx -y @x/mcp" } }),
		).toBeUndefined();
		expect(
			problem({
				...ok,
				mcp: { transport: "stdio", command: "rm -rf /; $(x)" },
			}),
		).toContain("mcp.command");
	});
});

describe("sign-in and publish scripts", () => {
	it("are served as JavaScript", async () => {
		for (const path of ["/signin.js", "/publish.js"]) {
			const res = await app.request(path);
			expect(res.headers.get("content-type")).toContain("text/javascript");
		}
	});

	it("sign in through publish.flisk.si and read only the login from a signed one-hour session", () => {
		expect(SIGNIN_JS).toContain("https://publish.flisk.si");
		expect(SIGNIN_JS).toContain("sessionStorage");
		expect(SIGNIN_JS).toContain("payload.exp > Date.now() / 1000");
		expect(SIGNIN_JS).not.toContain("localStorage.setItem(KEY");
	});

	it("both parse as JavaScript", () => {
		for (const js of [SIGNIN_JS, PUBLISH_JS])
			expect(() => new Function(js)).not.toThrow();
	});
});

describe("catalog API", () => {
	it("searches and gets listings", async () => {
		const r = (await (
			await app.request("/api/tools?q=readme&kind=app")
		).json()) as {
			total: number;
			items: { id: string }[];
		};
		expect(r.items.map((e) => e.id)).toContain("readme-score");
		const one = (await (await app.request("/api/tools/citable")).json()) as {
			name: string;
		};
		expect(one.name).toBe("Citable");
		expect((await app.request("/api/tools/nope")).status).toBe(404);
	});

	it("limits calls per client", async () => {
		const tight = createApp({ callsPerMinute: 1 });
		expect((await tight.request("/api/tools")).status).toBe(200);
		const res = await tight.request("/api/tools");
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBeTruthy();
	});
});

describe("MCP", () => {
	it("initializes, lists the tools, searches and reads a listing", async () => {
		const init = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: { protocolVersion: "2025-03-26" },
			})
		).json()) as { result: { protocolVersion: string } };
		expect(init.result.protocolVersion).toBe("2025-03-26");
		expect(
			(await rpc(app, { jsonrpc: "2.0", method: "notifications/initialized" }))
				.status,
		).toBe(202);
		const list = (await (
			await rpc(app, { jsonrpc: "2.0", id: 2, method: "tools/list" })
		).json()) as {
			result: { tools: { name: string }[] };
		};
		expect(list.result.tools.map((t) => t.name)).toEqual([
			"search_store",
			"get_listing",
		]);
		const found = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "search_store", arguments: { query: "readme" } },
			})
		).json()) as { result: { content: { text: string }[]; isError: boolean } };
		expect(found.result.isError).toBe(false);
		expect(found.result.content[0].text).toContain("README Score");
		const missing = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "get_listing", arguments: { id: "nope" } },
			})
		).json()) as { result: { isError: boolean } };
		expect(missing.result.isError).toBe(true);
	});

	it("answers unknown methods as JSON-RPC errors", async () => {
		const bad = (await (
			await rpc(app, { jsonrpc: "2.0", id: 5, method: "nope" })
		).json()) as {
			error: { code: number };
		};
		expect(bad.error.code).toBe(-32601);
	});
});

describe("guards", () => {
	it("counts hits per window", () => {
		let t = 0;
		const limiter = new RateLimiter(2, 1000, () => t);
		expect([
			limiter.hit("a"),
			limiter.hit("a"),
			limiter.hit("a") > 0,
			limiter.hit("b"),
		]).toEqual([0, 0, true, 0]);
		t = 1000;
		expect(limiter.hit("a")).toBe(0);
	});

	it("forgets cached entries after their time and beyond the size", () => {
		let t = 0;
		const cache = new TtlCache<number>(100, 2, () => t);
		cache.set("a", 1);
		cache.set("b", 2);
		cache.set("c", 3);
		expect(cache.get("a")).toBeUndefined();
		t = 100;
		expect(cache.get("c")).toBeUndefined();
	});
});
