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
		expect(page).toContain("A maintainer checks every pull request");
	});
});

describe("loop 4 fixes", () => {
	it("counts the type tabs within the chosen group, so they match the list", () => {
		const f = facets({ group: "Monorepos & frameworks", ring: "adopt" });
		expect(f.total).toBe(
			search({ group: "Monorepos & frameworks", ring: "adopt" }).total,
		);
	});

	it("does not put a retired tool first for k8s", () => {
		const top = search({ q: "k8s" }).items.slice(0, 3);
		expect(top.every((e) => e.ring !== "hold")).toBe(true);
	});

	it("reads 'docker' as Docker Desktop in the role finder", async () => {
		const page = await html("/roles?know=npm,+vite,+docker");
		expect(page).toContain("Docker Desktop");
		expect(page).toContain("normal start");
		expect(page).toMatch(/(a start|early match|good match|strong match)/);
	});

	it("keeps the 'coming soon' notes out of each station, in one place at the bottom", async () => {
		const page = await html("/journeys");
		expect(page).toContain("Where Flisk helps on this line");
		expect(page.match(/Flisk: Flisk does not/g) ?? []).toEqual([]);
	});

	it("hides chip counts that would not match the list while a query is active", async () => {
		const page = await html("/?q=code+review");
		expect(page).not.toMatch(/Adopt<small>/);
		expect(await html("/")).toMatch(/Adopt<small>\d+<\/small>/);
	});

	it("names the source repository on a skill's card, and shows the JSON example on publish", async () => {
		expect(await html("/?q=code+review&kind=skill")).toContain('class="src"');
		expect(await html("/publish")).toContain('"id":"link-checker"');
	});
});

describe("loop 5 fixes", () => {
	it("says the best fit in a sentence and folds the role catalogue away once there is an answer", async () => {
		const page = await html("/roles?know=npm,+vite,+docker");
		expect(page).toContain("Your best fit:");
		expect(page).toContain("Browse all 44 roles");
		expect(await html("/roles")).not.toContain("Browse all 44 roles");
	});

	it("names the routes as jobs and labels what to learn first", async () => {
		const page = await html("/journeys");
		expect(page).toContain("Platform engineer route");
		expect(page).toContain("Learn first");
		expect(page).toContain("Also worth knowing");
	});

	it("says plainly what kind of thing a listing is, and what MCP is", async () => {
		expect(await html("/listing/readme-score")).toContain(
			"A website: it opens in your browser at readme.flisk.si.",
		);
		expect(await html("/listing/mattpocock-code-review")).toContain(
			"An agent skill: a file your AI coding agent reads",
		);
		expect(await html("/listing/citable")).toContain(
			"MCP is how AI assistants like Claude plug into a tool",
		);
	});
});

describe("loop 6 fixes", () => {
	it("filters by category from a listing, and lets you clear it", async () => {
		const page = await html("/?category=Monorepo+tools");
		expect(page).toContain("Category");
		expect(page).toContain("Monorepo tools ×");
		const r = search({ category: "Monorepo tools" });
		expect(r.total).toBeGreaterThan(3);
		expect(r.items.every((e) => e.category === "Monorepo tools")).toBe(true);
		expect(await html("/listing/turborepo")).toContain(
			"category=Monorepo+tools",
		);
	});

	it("shows where a ring comes from, and when the numbers were fetched", async () => {
		const page = await html("/listing/pnpm");
		expect(page).toContain("checklist answers, not a test run here");
		expect(page).toContain("Evidence for the ring");
		expect(page).toMatch(/fetched 20\d\d-\d\d-\d\d/);
	});

	it("is honest that the offline check is the roadmap's answer, not a test", async () => {
		expect(await html("/?check=offline")).toContain("not a test run here");
	});

	it("lists what a maintainer checks and how to get a ring", async () => {
		const page = await html("/publish");
		expect(page).toContain("no duplicate of an existing listing");
		expect(page).toContain("add the tool there with a source");
	});
});

describe("loop 7 fixes", () => {
	it("sorts by stars when asked, on the page and in the API", async () => {
		const r = search({ q: "kubernetes", sort: "stars" }).items;
		for (let i = 1; i < r.length; i++)
			expect(r[i - 1].stars ?? 0).toBeGreaterThanOrEqual(r[i].stars ?? 0);
		const page = await html("/?q=kubernetes&sort=stars");
		expect(page).toContain("<b>Most starred</b>");
		expect(page).toContain("Best match</a>");
		const api = (await (
			await app.request("/api/tools?q=kubernetes&sort=stars")
		).json()) as { items: { stars?: number }[] };
		expect(api.items[0].stars ?? 0).toBeGreaterThanOrEqual(
			api.items[1].stars ?? 0,
		);
	});

	it("keeps the sort when another filter is clicked", async () => {
		expect(await html("/?q=docker&sort=stars")).toContain(
			"kind=app&amp;sort=stars",
		);
	});

	it("says a skill's stars are the whole repository's", async () => {
		expect(await html("/?q=code+review&kind=skill")).toContain(
			"Stars of the whole repository",
		);
		expect(await html("/listing/mattpocock-code-review")).toContain(
			"GitHub stars (whole repo)",
		);
	});

	it("shows how to install a skill, with the folder from its address", async () => {
		const page = await html("/listing/mattpocock-code-review");
		expect(page).toContain("Install it");
		expect(page).toContain(
			"git clone --depth 1 https://github.com/mattpocock/skills",
		);
		expect(page).toContain("~/.claude/skills/");
		expect(await html("/listing/citable")).not.toContain("Install it");
	});
});
