import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import { ENTRIES } from "../src/catalog";
import {
	compass,
	LEVELS,
	RINGS,
	ROADMAP_TOOLS,
	ROLES,
	resolveNames,
	SKILL_CATEGORIES,
	TRACKS,
	toolById,
	unit,
} from "../src/views";

const app = createApp({ publicUrl: "https://tool.test/" });
const page = async (path: string) => {
	const res = await app.request(path);
	return { status: res.status, html: await res.text() };
};

describe("views data", () => {
	it("gives every roadmap tool a ring and a position from 0 to 100", () => {
		expect(ROADMAP_TOOLS.length).toBeGreaterThan(300);
		for (const t of ROADMAP_TOOLS) {
			expect(RINGS.map((r) => r.id)).toContain(t.ring as never);
			const { x, y } = compass(t);
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThanOrEqual(100);
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThanOrEqual(100);
		}
	});

	it("only names tools that exist, in roles and journeys", () => {
		const ids = [
			...ROLES.flatMap((r) => [...r.core, ...r.daily, ...r.nice]),
			...TRACKS.flatMap((t) =>
				Object.values(t.stops).flatMap((s) => [...s.main, ...s.side]),
			),
		];
		expect(ids.length).toBeGreaterThan(500);
		for (const id of ids) expect(toolById(id)).toBeDefined();
		expect(TRACKS.every((t) => LEVELS.every((l) => t.stops[l.id]))).toBe(true);
	});

	it("keeps a dot where it is: the same id always gives the same number", () => {
		expect(unit("vite", "x")).toBe(unit("vite", "x"));
		expect(unit("vite", "x")).not.toBe(unit("vite", "y"));
		expect(unit("vite", "x")).toBeGreaterThanOrEqual(0);
		expect(unit("vite", "x")).toBeLessThan(1);
	});

	it("resolves 'yarn vs npm, bun' to those tools, once each", () => {
		expect(resolveNames("yarn vs npm vs bun").map((e) => e.id)).toEqual([
			"yarn",
			"npm",
			"bun",
		]);
		expect(resolveNames("yarn, yarn").length).toBe(1);
		expect(resolveNames("zzzz-nothing")).toEqual([]);
		expect(
			resolveNames("a vs b vs c vs d vs e vs f vs g", 5).length,
		).toBeLessThanOrEqual(5);
	});
});

describe("view pages", () => {
	it("has a tab for each view, and each page marks its own", async () => {
		const { html } = await page("/compass");
		for (const p of [
			"compass",
			"radar",
			"lab",
			"journeys",
			"roles",
			"skills",
			"ask",
		])
			expect(html).toContain(`href="/${p}"`);
		expect(html).toContain(
			'<a class="view-tab" href="/compass" aria-current="page">',
		);
	});

	it("draws the compass with a link on every dot", async () => {
		const { status, html } = await page("/compass");
		expect(status).toBe(200);
		expect(html.match(/<a href="\/listing\/[^"]+" class="dot">/g)?.length).toBe(
			ROADMAP_TOOLS.length,
		);
		expect((await page("/compass?family=foundations")).html).toContain(
			'<meta name="robots" content="noindex">',
		);
	});

	it("draws the radar with all four rings and lists the tools of each ring", async () => {
		const { html } = await page("/radar");
		for (const r of RINGS) expect(html).toContain(`class="ringbox r-${r.id}"`);
		expect(html).toContain("<svg");
		const family = await page("/radar?family=foundations");
		expect((family.html.match(/class="dot"/g) ?? []).length).toBeLessThan(
			ROADMAP_TOOLS.length,
		);
	});

	it("shows seven stations for a journey track, and switches track", async () => {
		const first = await page("/journeys");
		expect(first.html.match(/<span class="station"/g)?.length).toBe(7);
		const other = await page(`/journeys?track=${TRACKS[1].id}`);
		expect(other.html).toContain(TRACKS[1].blurb.slice(0, 20));
	});

	it("lists the roles of a group with their tools by tier", async () => {
		const { html } = await page("/roles?group=run");
		expect(html).toContain("Must have");
		expect(html).toContain("Good to know");
	});

	it("filters skills by category", async () => {
		const cat = SKILL_CATEGORIES[3];
		const { html } = await page(`/skills?cat=${cat.id}`);
		expect(html).toContain(`<small>`);
		expect(html).toContain('<meta name="robots" content="noindex">');
		const inCat = ENTRIES.filter(
			(e) => e.kind === "skill" && e.category === cat.name,
		).length;
		expect(html).toContain(`${inCat} skills`);
	});

	it("compares tools side by side from the data, and escapes the question", async () => {
		const { html } = await page("/ask?q=yarn+vs+npm+vs+bun");
		expect(html).toContain('<table class="compare">');
		expect(html).toContain("Adoption ring");
		for (const n of ["Yarn", "npm", "Bun"]) expect(html).toContain(`>${n}</a>`);
		const evil = await page("/ask?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
		expect(evil.html).not.toContain("<script>alert");
		expect((await page("/ask?q=zzzz-nothing")).html).toContain(
			"No tool matched",
		);
	});

	it("lists every view in the sitemap", async () => {
		const xml = (await page("/sitemap.xml")).html;
		for (const p of [
			"compass",
			"radar",
			"journeys",
			"roles",
			"skills",
			"ask",
			"lab",
		])
			expect(xml).toContain(`<loc>https://tool.test/${p}</loc>`);
	});
});
