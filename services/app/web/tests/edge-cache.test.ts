import { describe, expect, it } from "bun:test";
import { type EdgeCache, withEdgeCache } from "../src/edge-cache";

function memoryCache() {
	const m = new Map<string, Response>();
	const cache: EdgeCache = {
		match: async (r) => m.get(r.url)?.clone(),
		put: async (r, res) => void m.set(r.url, res),
	};
	return { m, cache };
}
const page = (status = 200, type = "text/html; charset=UTF-8") => {
	let renders = 0;
	return {
		count: () => renders,
		render: async () => {
			renders++;
			return new Response(`<p>${renders}</p>`, {
				status,
				headers: { "content-type": type },
			});
		},
	};
};
const run = async (
	url: string,
	p: ReturnType<typeof page>,
	cache: EdgeCache,
	method = "GET",
) => {
	const waits: Promise<unknown>[] = [];
	const res = await withEdgeCache(
		new Request(url, { method }),
		p.render,
		cache,
		(w) => waits.push(w),
	);
	await Promise.all(waits);
	return res;
};

describe("edge cache for HTML pages", () => {
	it("renders a page once and serves the copy after, per URL", async () => {
		const { cache } = memoryCache();
		const p = page();
		expect(await (await run("https://t.test/", p, cache)).text()).toBe(
			"<p>1</p>",
		);
		const again = await run("https://t.test/", p, cache);
		expect(await again.text()).toBe("<p>1</p>");
		expect(again.headers.get("cache-control")).toBe(
			"public, max-age=300, s-maxage=600",
		);
		await run("https://t.test/about", p, cache);
		expect(p.count()).toBe(2);
		// a filter view always reaches the app (crawlers there get its 301)
		await run("https://t.test/?kind=tool", p, cache);
		await run("https://t.test/?kind=tool", p, cache);
		expect(p.count()).toBe(4);
	});

	it("puts its own cache-control on a hit, not the zone's 4-hour browser TTL", async () => {
		const cache: EdgeCache = {
			match: async () =>
				new Response("<p>old</p>", {
					headers: {
						"content-type": "text/html",
						"cache-control": "public, max-age=14400",
					},
				}),
			put: async () => {},
		};
		const res = await run("https://t.test/", page(), cache);
		expect(res.headers.get("cache-control")).toBe(
			"public, max-age=300, s-maxage=600",
		);
	});

	it("never caches the API, MCP, errors, non-HTML or non-GET", async () => {
		const { m, cache } = memoryCache();
		for (const path of ["/api/listings", "/mcp", "/health"])
			await run(`https://t.test${path}`, page(), cache);
		await run("https://t.test/missing", page(404), cache);
		await run("https://t.test/robots.txt", page(200, "text/plain"), cache);
		await run("https://t.test/", page(), cache, "POST");
		expect(m.size).toBe(0);
	});

	it("still answers when the cache is missing or failing", async () => {
		const p = page();
		expect(
			(await run("https://t.test/", p, undefined as unknown as EdgeCache))
				.status,
		).toBe(200);
		const broken: EdgeCache = {
			match: () => Promise.reject(new Error("x")),
			put: () => Promise.reject(new Error("y")),
		};
		expect((await run("https://t.test/", p, broken)).status).toBe(200);
	});
});
