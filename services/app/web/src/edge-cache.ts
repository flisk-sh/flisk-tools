// Every HTML page here is a pure function of its URL (the catalog is built in), so a rendered page is kept in the
// data center's Cache API for 10 minutes. Rendering the home page with ~800 listings takes up to 15 ms of CPU, over
// the Workers Free limit of 10 ms a request; a cache hit takes well under 1 ms. Cache API reads and writes are free
// and do not count as Worker requests. Only URLs without a query string are kept: a filter view is rarer, and a crawler
// on one must still reach the app's 301 (app.ts).

const TTL_SECONDS = 600;
// Browsers keep a page 5 minutes (a reload within that costs no Worker request); this cache keeps it 10.
const CACHE_CONTROL = `public, max-age=300, s-maxage=${TTL_SECONDS}`;
const SKIP = /^\/(api\/|mcp|health|ready)/;

// A content hash lets a repeat visit get a 304 instead of the whole page. It
// changes on a deploy because the rendered HTML does, without a version file.
function etagOf(body: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < body.length; i++) {
		h ^= body.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return `"${(h >>> 0).toString(16)}-${body.length.toString(16)}"`;
}

export interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

async function withEtag(request: Request, res: Response): Promise<Response> {
	if (
		res.status !== 200 ||
		!(res.headers.get("content-type") ?? "").includes("text/html") ||
		res.headers.has("set-cookie")
	)
		return res;
	const etag = etagOf(await res.clone().text());
	if (request.headers.get("if-none-match") === etag) {
		return new Response(null, {
			status: 304,
			headers: { "cache-control": CACHE_CONTROL, etag },
		});
	}
	const out = new Response(res.body, res);
	out.headers.set("etag", etag);
	return out;
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
	// A hit comes back with the zone's browser-cache TTL (4 hours) in place of ours; reset it so a deploy shows within minutes.
	if (hit) {
		const fresh = new Response(hit.body, hit);
		fresh.headers.set("cache-control", CACHE_CONTROL);
		return withEtag(request, fresh);
	}
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
	return withEtag(request, stored);
}
