// Baseline security headers for every response the Worker sends (pages, API, redirects, 404s). The Hono app sets most of
// them (guard.ts securityHeaders), but an early-return redirect skips its middleware, and a response that comes back
// from the edge cache or a sub-fetch can have immutable headers. This wrapper fills in whatever is missing, so a header
// the app already set (or a stricter CSP with its own frame-ancestors) is kept as is.
import { securityHeaders } from "./guard";

export function withSecurityHeaders(res: Response): Response {
	const missing = Object.entries(securityHeaders()).filter(
		([k]) => !res.headers.has(k),
	);
	const csp = res.headers.get("content-security-policy");
	const needsAncestors = csp !== null && !/frame-ancestors/i.test(csp);
	if (missing.length === 0 && !needsAncestors) return res;
	// Response headers can be immutable, so copy into a new Response.
	const out = new Response(res.body, res);
	for (const [k, v] of missing) out.headers.set(k, v);
	if (needsAncestors)
		out.headers.set(
			"content-security-policy",
			`${csp}; frame-ancestors 'self' https://analytics.flisk.si`,
		);
	return out;
}
