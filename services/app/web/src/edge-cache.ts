// Every HTML page here is a pure function of its URL (the catalog is built in), so a rendered page is kept in the
// data center's Cache API for 10 minutes. Rendering the home page with ~800 listings takes up to 15 ms of CPU, over
// the Workers Free limit of 10 ms a request; a cache hit takes well under 1 ms. Cache API reads and writes are free
// and do not count as Worker requests. Only URLs without a query string are kept: a filter view is rarer, and a crawler
// on one must still reach the app's 301 (app.ts).

const TTL_SECONDS = 600;
const SKIP = /^\/(api\/|mcp|health|ready)/;

export interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

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
	const hit = await cache.match(key).catch(() => undefined);
	if (hit) return hit;
	const res = await render(request);
	if (
		res.status !== 200 ||
		!(res.headers.get("content-type") ?? "").includes("text/html") ||
		res.headers.has("set-cookie")
	)
		return res;
	const stored = new Response(res.body, res);
	// s-maxage is for this cache only; browsers keep revalidating as before (max-age=0).
	stored.headers.set(
		"cache-control",
		`public, max-age=0, s-maxage=${TTL_SECONDS}`,
	);
	waitUntil(cache.put(key, stored.clone()).catch(() => {}));
	return stored;
}
