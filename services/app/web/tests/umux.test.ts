import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import {
	issueUrl,
	parseIssue,
	readAnswer,
	UMUX_LABEL,
	umuxAdjusted,
	umuxMean,
	umuxScore,
} from "../src/umux";

const app = createApp({ publicUrl: "https://tool.test/" });

describe("UMUX-Lite score", () => {
	it("is 0 for 1 and 1, 100 for 7 and 7, and (c + e - 2) / 12 in between", () => {
		expect(umuxScore({ capabilities: 1, easy: 1 })).toBe(0);
		expect(umuxScore({ capabilities: 7, easy: 7 })).toBe(100);
		expect(umuxScore({ capabilities: 5, easy: 4 })).toBeCloseTo(58.33, 1);
	});

	it("maps onto the SUS scale with the published regression", () => {
		expect(umuxAdjusted({ capabilities: 7, easy: 7 })).toBeCloseTo(87.9, 1);
		expect(umuxAdjusted({ capabilities: 1, easy: 1 })).toBeCloseTo(22.9, 1);
	});

	it("averages answers, and says nothing for none", () => {
		expect(umuxMean([])).toBeUndefined();
		expect(
			umuxMean([
				{ capabilities: 7, easy: 7 },
				{ capabilities: 1, easy: 1 },
			]),
		).toBe(50);
	});

	it("only accepts whole numbers from 1 to 7", () => {
		expect(readAnswer("5", "4")).toEqual({ capabilities: 5, easy: 4 });
		for (const bad of [
			["0", "4"],
			["8", "4"],
			["5.5", "4"],
			["x", "4"],
			["5", undefined],
			[undefined, undefined],
		])
			expect(readAnswer(bad[0], bad[1])).toBeUndefined();
	});
});

describe("the survey", () => {
	it("round-trips an answer through the GitHub issue address", () => {
		const url = new URL(
			issueUrl(
				"https://github.com/o/r",
				{ capabilities: 6, easy: 5 },
				"More filters",
				"https://tool.test",
			),
		);
		expect(url.pathname).toBe("/o/r/issues/new");
		expect(url.searchParams.get("labels")).toBe(UMUX_LABEL);
		expect(url.searchParams.get("title")).toContain("UMUX-Lite");
		const body = url.searchParams.get("body") ?? "";
		expect(parseIssue(body)).toEqual({ capabilities: 6, easy: 5 });
		expect(body).toContain("More filters");
	});

	it("shows the two questions, no scripts needed", async () => {
		const html = await (await app.request("/rate")).text();
		expect(html).toContain("capabilities meet my requirements");
		expect(html).toContain("This site is easy to use");
		expect(html.match(/type="radio"/g)?.length).toBe(14);
		expect(html).toContain('<meta name="robots" content="noindex">');
	});

	it("sends a valid answer to GitHub, and refuses an invalid one", async () => {
		const ok = await app.request("/umux?c=6&e=5&note=hello");
		expect(ok.status).toBe(303);
		expect(ok.headers.get("location")).toStartWith(
			"https://github.com/flisk-sh/flisk-tools/issues/new?",
		);
		expect((await app.request("/umux?c=9&e=5")).status).toBe(400);
		expect((await app.request("/umux")).status).toBe(400);
	});

	it("is linked from every page's footer", async () => {
		expect(await (await app.request("/about")).text()).toContain(
			'href="/rate">Rate this site',
		);
	});
});
