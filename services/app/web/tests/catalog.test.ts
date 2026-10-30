import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENTRIES, type Entry, problem } from "../src/catalog";

const root = join(import.meta.dir, "../../../..");
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const listings = readdirSync(join(root, "listings")).filter((f) =>
	f.endsWith(".json"),
);

describe("catalog files", () => {
	it("every entry is well formed and ids are unique", () => {
		const ids = new Set<string>();
		for (const e of ENTRIES) {
			expect(problem(e)).toBeUndefined();
			expect(ids.has(e.id)).toBe(false);
			ids.add(e.id);
		}
	});

	it("src/catalog.generated.json is up to date: run `bun run catalog`", () => {
		const ids = new Set<string>();
		for (const f of readdirSync(join(root, "catalog")).filter(
			(x) =>
				x.endsWith(".json") && x !== "overrides.json" && x !== "views.json",
		))
			for (const e of json(join(root, "catalog", f)) as Entry[]) ids.add(e.id);
		for (const f of listings) ids.add(json(join(root, "listings", f)).id);
		expect(new Set(ENTRIES.map((e) => e.id))).toEqual(ids);
	});

	it("every listing file is named after its author's login and its own id", () => {
		for (const f of listings) {
			const m = /^([a-z0-9][a-z0-9-]{0,38})--(.+)\.json$/.exec(f);
			expect(m).not.toBeNull();
			expect(json(join(root, "listings", f)).id).toBe(m?.[2]);
			const e = ENTRIES.find((x) => x.id === m?.[2]);
			expect(e?.author).toBe(m?.[1]);
			expect(e?.official).toBe(false);
		}
	});

	it("applies catalog/overrides.json, like the Playwright MCP server", () => {
		expect(ENTRIES.find((e) => e.id === "playwright-mcp")?.mcp?.command).toBe(
			"npx @playwright/mcp@latest",
		);
	});

	it("rejects bad listings", () => {
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
		expect(problem(ok)).toBeUndefined();
		expect(problem({ ...ok, url: "http://x.test" })).toContain("https");
		expect(problem({ ...ok, id: "Bad Id" })).toContain("id");
		expect(problem({ ...ok, url: 'https://x.test/"onmouseover="x' })).toContain(
			"https",
		);
		expect(problem({ ...ok, kind: "nope" as never })).toContain("kind");
		expect(problem({ ...ok, repo: "no-slash" })).toContain("repo");
	});
});
