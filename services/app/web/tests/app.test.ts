import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { createApp } from "../src/app";
import { RateLimiter, TtlCache } from "../src/guard";
import { findTool, TOOLS } from "../src/tools";

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
	it("has a tools/<id>/main.ts for every runnable tool, an https address for every link, and ids that are safe in a path", () => {
		for (const a of TOOLS) {
			expect(a.id).toMatch(/^[a-z0-9-]+$/);
			if (a.kind === "link") {
				expect(a.url).toMatch(/^https:\/\/[^\s]+$/);
				continue;
			}
			expect(
				existsSync(`${import.meta.dir}/../../../../tools/${a.id}/main.ts`),
			).toBe(true);
			expect(a.inputs.length).toBeGreaterThan(0);
			for (const i of a.inputs)
				expect(Object.keys(a.example)).toContain(i.name);
		}
		expect(new Set(TOOLS.map((a) => a.id)).size).toBe(TOOLS.length);
	});
});

describe("pages", () => {
	it("lists every Tool on the home page under a policy that allows no scripts", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);
		const csp = res.headers.get("content-security-policy");
		expect(csp).toContain("default-src 'none'");
		expect(csp).not.toContain("script-src");
		const html = await res.text();
		for (const a of TOOLS) expect(html).toContain(`/tools/${a.id}`);
		expect(html).not.toContain("<script src");
	});

	it("sends a link tool to where it lives, and a runnable one to the console", async () => {
		const link = await (await app.request("/tools/citable")).text();
		expect(link).toContain('href="https://citable.flisk.si"');
		expect(link).not.toContain("/console?");
	});

	it("gives each Tool a page, and 404s an unknown one", async () => {
		const html = await (await app.request("/tools/repo-stats")).text();
		expect(html).toContain("console?tool=repo-stats&amp;repo=flisk-sh%2Fflisk");
		expect((await app.request("/tools/nope")).status).toBe(404);
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
	it("lists and gets Tools", async () => {
		const list = (await (await app.request("/api/tools")).json()) as {
			tools: { id: string }[];
		};
		expect(list.tools.map((a) => a.id)).toEqual(TOOLS.map((a) => a.id));
		const one = (await (
			await app.request("/api/tools/stack-scanner")
		).json()) as {
			name: string;
		};
		expect(one.name).toBe(findTool("stack-scanner")?.name as string);
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
	it("initializes, lists the tools and reads a Tool", async () => {
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
			"list_tools",
			"get_tool",
		]);
		const call = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "get_tool", arguments: { id: "repo-stats" } },
			})
		).json()) as { result: { content: { text: string }[]; isError: boolean } };
		expect(call.result.isError).toBe(false);
		expect(call.result.content[0].text).toContain("Example input");
		const missing = (await (
			await rpc(app, {
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "get_tool", arguments: { id: "nope" } },
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
