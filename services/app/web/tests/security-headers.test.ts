import { describe, expect, it } from "bun:test";
import { withSecurityHeaders } from "../src/security-headers";
import worker from "../src/worker";

const BASELINE: Record<string, string> = {
	"x-content-type-options": "nosniff",
	"x-frame-options": "SAMEORIGIN",
	"strict-transport-security": "max-age=31536000; includeSubDomains",
	"referrer-policy": "strict-origin-when-cross-origin",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
};
const ctx = { waitUntil() {} };
const env = { PUBLIC_URL: "https://tools.flisk.si/" };

function expectBaseline(res: Response) {
	for (const [k, v] of Object.entries(BASELINE))
		expect(res.headers.get(k)).toBe(v);
	expect(res.headers.get("content-security-policy")).toContain(
		"frame-ancestors",
	);
}

describe("security headers on the Worker", () => {
	it("are on the home page", async () => {
		const res = await worker.fetch(
			new Request("https://tools.flisk.si/"),
			env,
			ctx,
		);
		expect(res.status).toBe(200);
		expectBaseline(res);
	});

	it("are on a 404", async () => {
		const res = await worker.fetch(
			new Request("https://tools.flisk.si/no-such-page"),
			env,
			ctx,
		);
		expect(res.status).toBe(404);
		expectBaseline(res);
	});

	it("are on the trailing-slash redirect", async () => {
		const res = await worker.fetch(
			new Request("https://tools.flisk.si/about/"),
			env,
			ctx,
		);
		expect(res.status).toBe(301);
		expectBaseline(res);
	});
});

describe("withSecurityHeaders", () => {
	it("fills in a bare response, even one with immutable headers", () => {
		const res = withSecurityHeaders(Response.redirect("https://a.test/", 302));
		for (const [k, v] of Object.entries(BASELINE))
			expect(res.headers.get(k)).toBe(v);
	});

	it("keeps an existing CSP and adds frame-ancestors only when it is missing", () => {
		const a = withSecurityHeaders(
			new Response("x", {
				headers: { "content-security-policy": "default-src 'self'" },
			}),
		);
		expect(a.headers.get("content-security-policy")).toBe(
			"default-src 'self'; frame-ancestors 'self' https://analytics.flisk.si",
		);
		const b = withSecurityHeaders(
			new Response("x", {
				headers: {
					"content-security-policy":
						"default-src 'none'; frame-ancestors 'none'",
				},
			}),
		);
		expect(b.headers.get("content-security-policy")).toBe(
			"default-src 'none'; frame-ancestors 'none'",
		);
	});

	it("does not overwrite headers the app already set", () => {
		const res = withSecurityHeaders(
			new Response("x", { headers: { "x-frame-options": "DENY" } }),
		);
		expect(res.headers.get("x-frame-options")).toBe("DENY");
	});
});
