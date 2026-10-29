import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { ACTORS, findActor } from "../src/actors";
import { createApp } from "../src/app";
import { RateLimiter, TtlCache } from "../src/guard";

const app = createApp({
	publicUrl: "https://tool.test/",
	clientId: "Iv1.test",
});
const rpc = (a: ReturnType<typeof createApp>, body: unknown) =>
	a.request("/mcp", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

describe("catalog", () => {
	it("has an actors/<id>/main.ts for every Actor, and ids that are safe in a path", () => {
		for (const a of ACTORS) {
			expect(a.id).toMatch(/^[a-z0-9-]+$/);
			expect(
				existsSync(`${import.meta.dir}/../../../../actors/${a.id}/main.ts`),
			).toBe(true);
			expect(a.inputs.length).toBeGreaterThan(0);
			for (const i of a.inputs)
				expect(Object.keys(a.example)).toContain(i.name);
		}
		expect(new Set(ACTORS.map((a) => a.id)).size).toBe(ACTORS.length);
	});
});

describe("pages", () => {
	it("lists every Actor on the home page under a policy that allows no scripts", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);
		const csp = res.headers.get("content-security-policy");
		expect(csp).toContain("default-src 'none'");
		expect(csp).not.toContain("script-src");
		const html = await res.text();
		for (const a of ACTORS) expect(html).toContain(`/actors/${a.id}`);
		expect(html).not.toContain("<script src");
	});

	it("gives each Actor a page, and 404s an unknown one", async () => {
		const html = await (await app.request("/actors/repo-stats")).text();
		expect(html).toContain(
			"console?actor=repo-stats&amp;repo=flisk-sh%2Fflisk",
		);
		expect((await app.request("/actors/nope")).status).toBe(404);
	});

	it("allows the console's script, and only that page", async () => {
		const res = await app.request("/console");
		const csp = res.headers.get("content-security-policy") ?? "";
		expect(csp).toContain("script-src 'self'");
		expect(csp).toContain("connect-src 'self' https://api.github.com");
		expect(await res.text()).toContain('<script src="/console.js" defer>');
		const js = await app.request("/console.js");
		expect(js.headers.get("content-type")).toContain("text/javascript");
		expect((await js.text()).length).toBeGreaterThan(500);
	});

	it("builds links under the prefix a proxy stripped, and ignores a hostile one", async () => {
		const local = createApp();
		const html = await (
			await local.request("http://api.tool.localhost/", {
				headers: { "x-forwarded-prefix": "/api/web" },
			})
		).text();
		expect(html).toContain('href="/api/web/console"');
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

describe("catalog API", () => {
	it("lists and gets Actors", async () => {
		const list = (await (await app.request("/api/actors")).json()) as {
			actors: { id: string }[];
		};
		expect(list.actors.map((a) => a.id)).toEqual(ACTORS.map((a) => a.id));
		const one = (await (
			await app.request("/api/actors/stack-scanner")
		).json()) as {
			name: string;
		};
		expect(one.name).toBe(findActor("stack-scanner")?.name as string);
		expect((await app.request("/api/actors/nope")).status).toBe(404);
	});

	it("limits calls per client", async () => {
		const tight = createApp({ callsPerMinute: 1 });
		expect((await tight.request("/api/actors")).status).toBe(200);
		const res = await tight.request("/api/actors");
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBeTruthy();
	});
});

describe("sign-in relay", () => {
	const seen: { url: string; body: string }[] = [];
	const fetcher = (async (url: string, init?: RequestInit) => {
		seen.push({ url, body: String(init?.body) });
		return Response.json({ device_code: "abc", access_token: "tok" });
	}) as unknown as typeof fetch;
	const relay = createApp({ clientId: "Iv1.test", fetcher });

	it("asks GitHub for a device code with the public_repo and workflow scopes", async () => {
		const res = await relay.request("/auth/device", { method: "POST" });
		expect(res.status).toBe(200);
		expect(seen[0].url).toBe("https://github.com/login/device/code");
		expect(seen[0].body).toContain("client_id=Iv1.test");
		expect(seen[0].body).toContain("scope=public_repo+workflow");
	});

	it("trades a device code for a token, and refuses a malformed code", async () => {
		const ok = await relay.request("/auth/token", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ device_code: "0123456789abcdef" }),
		});
		expect(((await ok.json()) as { access_token: string }).access_token).toBe(
			"tok",
		);
		expect(seen.at(-1)?.body).toContain(
			"grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code",
		);
		const bad = await relay.request("/auth/token", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ device_code: "x&client_id=evil" }),
		});
		expect(bad.status).toBe(400);
	});

	it("says so when no client id is set, and does not accept GET", async () => {
		const off = createApp();
		expect((await off.request("/auth/device", { method: "POST" })).status).toBe(
			503,
		);
		expect((await relay.request("/auth/device")).status).toBe(404);
	});
});

describe("MCP", () => {
	it("initializes, lists the tools and reads an Actor", async () => {
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
		).json()) as { result: { tools: { name: string }[] } };
		expect(list.result.tools.map((t) => t.name)).toEqual([
			"list_actors",
			"get_actor",
		]);
		const call = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "get_actor", arguments: { id: "repo-stats" } },
			})
		).json()) as { result: { content: { text: string }[]; isError: boolean } };
		expect(call.result.isError).toBe(false);
		expect(call.result.content[0].text).toContain("Example input");
		const missing = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "get_actor", arguments: { id: "nope" } },
			})
		).json()) as { result: { isError: boolean } };
		expect(missing.result.isError).toBe(true);
	});

	it("answers unknown methods as JSON-RPC errors", async () => {
		const bad = (await (
			await rpc(app, { jsonrpc: "2.0", id: 5, method: "nope" })
		).json()) as { error: { code: number } };
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
