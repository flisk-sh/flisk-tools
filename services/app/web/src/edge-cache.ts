// Every HTML page here is a pure function of its URL (the catalog is built in), so a rendered page is kept in the
// data center's Cache API for 10 minutes. The three public crawler files can opt in to their own cache lifetime.
// Rendering the home page with ~800 listings takes up to 15 ms of CPU, over
// the Workers Free limit of 10 ms a request; a cache hit takes well under 1 ms. Cache API reads and writes are free
// and do not count as Worker requests. Only URLs without a query string are kept: a filter view is rarer, and a crawler
// on one must still reach the app's 301 (app.ts).

const TTL_SECONDS = 600;
// Browsers keep a page 5 minutes (a reload within that costs no Worker request); this cache keeps it 10.
const CACHE_CONTROL = `public, max-age=300, s-maxage=${TTL_SECONDS}`;
const SKIP = /^\/(api\/|mcp|health|ready)/;

export interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

export const SEO_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

const SEO_TYPES = new Map([
	["/sitemap.xml", "application/xml"],
	["/robots.txt", "text/plain"],
	["/llms.txt", "text/plain"],
]);

export async function withEdgeCache(
	request: Request,
	render: (request: Request) => Response | Promise<Response>,
	cache: EdgeCache | undefined,
	waitUntil: (p: Promise<unknown>) => void,
): Promise<Response> {
	const url = new URL(request.url);
	if (
		!cache ||
		request.method !== "GET" ||
		url.search ||
		SKIP.test(url.pathname)
	)
		return render(request);
	const key = new Request(url.toString(), { method: "GET" });
	const seoType = SEO_TYPES.get(url.pathname);
	const hit = await cache.match(key).catch(() => undefined);
	// A hit comes back with the zone's browser-cache TTL (4 hours) in place of ours; reset it so a deploy shows within minutes.
	if (hit) {
		const fresh = new Response(hit.body, hit);
		fresh.headers.set(
			"cache-control",
			seoType ? SEO_CACHE_CONTROL : CACHE_CONTROL,
		);
		return fresh;
	}
	const res = await render(request);
	if (res.status !== 200 || res.headers.has("set-cookie")) return res;
	const type = res.headers.get("content-type")?.split(";")[0]?.trim();
	if (seoType) {
		if (
			type === seoType &&
			res.headers.get("cache-control") === SEO_CACHE_CONTROL
		)
			waitUntil(cache.put(key, res.clone()).catch(() => {}));
		return res;
	}
	if (type !== "text/html") return res;
	const stored = new Response(res.body, res);
	// s-maxage is for this cache only; browsers keep revalidating as before (max-age=0).
	stored.headers.set(
		"cache-control",
		`public, max-age=0, s-maxage=${TTL_SECONDS}`,
	);
	waitUntil(cache.put(key, stored.clone()).catch(() => {}));
	return stored;
}
