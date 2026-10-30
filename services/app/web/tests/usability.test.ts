import { describe, expect, it } from "bun:test";
import { run, TASKS } from "../scripts/usability/tasks";
import { createApp } from "../src/app";
import { facets, search } from "../src/catalog";
import { jumpLinks } from "../src/jump";

const app = createApp({ publicUrl: "https://tool.test/" });
const html = async (path: string) => (await app.request(path)).text();

describe("usability tasks", () => {
	it("finds what a visitor asks for, near the top", () => {
		const { rows, top5, mrr } = run();
		expect(rows.length).toBe(TASKS.length);
		for (const r of rows) expect(r.rank, `${r.id} "${r.q}"`).toBeGreaterThan(0);
		expect(top5).toBeGreaterThanOrEqual(0.9);
		expect(mrr).toBeGreaterThan(0.8);
	});

	it("ranks real monorepo tools above frameworks for 'monorepo'", () => {
		const ids = search({ q: "monorepo", ring: "adopt" })
			.items.slice(0, 6)
			.map((e) => e.id);
		expect(ids).toContain("turborepo");
		expect(ids).toContain("nx");
		expect(ids).not.toContain("nextjs");
	});

	it("names three tools from 'yarn pnpm bun' even though no listing holds all three", () => {
		expect(
			search({ q: "yarn pnpm bun" })
				.items.slice(0, 3)
				.map((e) => e.id)
				.sort(),
		).toEqual(["bun", "pnpm", "yarn"]);
	});
});

describe("search page", () => {
	it("jumps from a role or a comparison to the tab that answers it", async () => {
		expect(
			jumpLinks("platform engineer", "").some((j) => j.kind === "role"),
		).toBe(true);
		expect(
			jumpLinks("yarn vs pnpm", "").some((j) => j.kind === "compare"),
		).toBe(true);
		expect(jumpLinks("docker", "")).toEqual([]);
		expect(await html("/?q=platform+engineer")).toContain("Jump to");
	});

	it("counts the tabs for the query, not for the whole store", async () => {
		const f = facets({ q: "k8s" });
		expect(f.total).toBeLessThan(787);
		expect(f.total).toBe(Object.values(f.kinds).reduce((a, b) => a + b, 0));
		expect(f.groups[0].count).toBeLessThanOrEqual(f.total);
	});

	it("keeps filters when another one is clicked", async () => {
		const page = await html("/?group=Monorepos+%26+frameworks");
		expect(page).toContain("group=Monorepos+%26+frameworks&amp;ring=adopt");
		const withRing = await html(
			"/?group=Monorepos+%26+frameworks&ring=adopt&check=offline",
		);
		expect(withRing).toContain("group=Monorepos+%26+frameworks");
		expect(withRing).toContain("ring=adopt");
	});

	it("starts a new visitor with four ways in, and drops them once they search", async () => {
		const home = await html("/");
		for (const t of [
			"Find a tool",
			"Which role fits me?",
			"Learn a path",
			"Compare tools",
		])
			expect(home).toContain(t);
		expect(await html("/?q=docker")).not.toContain('aria-label="Start here"');
	});

	it("explains an empty result and offers a way out", async () => {
		const page = await html("/?q=zzzz-no-such-thing");
		expect(page).toContain("Nothing matches");
		expect(page).toContain("Add it.");
	});

	it("shows the maturity ring on each roadmap tool's card", async () => {
		expect(await html("/?q=turborepo")).toMatch(/class="rk r-adopt"/);
	});
});

describe("roles finder", () => {
	it("turns tool names into the roles that fit, with what to learn next, without a script", async () => {
		const page = await html("/roles?know=npm,+vite,+docker");
		expect(page).toContain("Understood: npm, Vite");
		expect(page).toContain("Learn next:");
		expect(page).toContain('class="fit-top"');
	});

	it("says what it could not find, and escapes what was typed", async () => {
		const page = await html(
			"/roles?know=npm,+%3Cscript%3Ealert(1)%3C/script%3E",
		);
		expect(page).toContain("Not found:");
		expect(page).not.toContain("<script>alert");
	});
});

describe("maturity on listings and in compare", () => {
	it("shows release and last push for a tool", async () => {
		const page = await html("/listing/bun");
		expect(page).toContain("Latest release");
		expect(page).toContain("Last push");
	});

	it("puts release dates in the comparison and explains the scores", async () => {
		const page = await html("/ask?q=yarn+vs+pnpm+vs+bun");
		expect(page).toContain("Latest release");
		expect(page).toContain("10 points each");
	});
});

describe("publish form", () => {
	it("suggests existing groups and categories, and says which buttons to press on GitHub", async () => {
		const page = await html("/publish");
		expect(page).toContain('<datalist id="dl-groups">');
		expect(page).toContain("Propose changes");
		expect(page).toContain("Browsing the store needs no sign-in");
	});
});

describe("loop 3 fixes", () => {
	it("accepts ?q= on the roles page as well as ?know=", async () => {
		expect(await html("/roles?q=npm+vite+docker")).toContain(
			"Understood: npm, Vite",
		);
	});

	it("shows the three journey routes as cards with a line each", async () => {
		const page = await html("/journeys");
		expect(page.match(/route<\/b><small>/g)?.length).toBe(3);
	});

	it("gives a plain verdict and explains the rings under a comparison", async () => {
		const page = await html("/ask?q=yarn+vs+pnpm+vs+bun");
		expect(page).toContain("Most recent release:");
		expect(page).toContain("Most starred:");
		expect(page).toContain("What the rings mean");
		expect(page).toContain("There is no single winner");
	});

	it("ticks each card that meets the active check", async () => {
		expect(await html("/?check=offline")).toContain(
			"✓ Runs offline, no account",
		);
	});

	it("says what a listing needs and who reviews it", async () => {
		const page = await html("/publish");
		expect(page).toContain("Listing rules");
		expect(page).toContain("A maintainer reviews every pull request");
	});
});
