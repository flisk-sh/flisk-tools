import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import { PORTFOLIO_JS } from "../src/client";
import {
	cleanName,
	familyShape,
	meString,
	parseMe,
	portfolioMarkdown,
	roleFit,
} from "../src/portfolio";
import { ROLES } from "../src/views";

const app = createApp({ publicUrl: "https://tool.test/" });

describe("parseMe", () => {
	it("reads ids with a level of 1 to 3 and drops the rest", () => {
		expect(parseMe("docker-desktop3,vite2")).toEqual({
			"docker-desktop": 3,
			vite: 2,
		});
		expect(parseMe("docker-desktop4,vite0,nope3,,docker-compose1")).toEqual({
			"docker-compose": 1,
		});
		expect(parseMe("vite3,vite1")).toEqual({ vite: 3 });
		expect(parseMe(undefined)).toEqual({});
		expect(parseMe("x".repeat(20000))).toEqual({});
	});

	it("round-trips through meString in a stable order", () => {
		const me = parseMe("vite2,docker-desktop3");
		expect(meString(me)).toBe("docker-desktop3,vite2");
		expect(parseMe(meString(me))).toEqual(me);
	});
});

describe("roleFit", () => {
	const role = ROLES.find((r) => r.core.length >= 3) ?? ROLES[0];

	it("puts the role you rated best on top, and scores nothing for no ratings", () => {
		expect(roleFit({}).every((f) => f.pct === 0)).toBe(true);
		const me = parseMe(
			[...role.core, ...role.daily].map((id) => `${id}3`).join(","),
		);
		expect(roleFit(me)[0].role.id).toBe(role.id);
		expect(roleFit(me)[0].pct).toBeGreaterThan(30);
	});

	it("lists must-have tools you have not rated as gaps, and halves a match with none of the key tools", () => {
		const fit = roleFit({}).find((f) => f.role.id === role.id);
		expect(fit?.gaps.length).toBeGreaterThan(0);
		const withKey = ROLES.find(
			(r) => (r.key ?? []).length > 0 && r.core.length > 0,
		);
		if (withKey) {
			const nonKey = [...withKey.core, ...withKey.daily].filter(
				(id) => !(withKey.key ?? []).includes(id),
			);
			const me = parseMe(nonKey.map((id) => `${id}3`).join(","));
			expect(roleFit(me).find((f) => f.role.id === withKey.id)?.noKey).toBe(
				true,
			);
		}
	});

	it("totals your ratings per family", () => {
		const shape = familyShape(parseMe("docker-desktop3,vite2"));
		expect(shape.reduce((a, s) => a + s.sum, 0)).toBe(5);
		expect(shape.reduce((a, s) => a + s.known, 0)).toBe(2);
	});
});

describe("text", () => {
	it("cleans a name of markup and control characters", () => {
		expect(cleanName('Al<script>"`ex\u0007')).toBe("Alscriptex");
		expect(cleanName("x".repeat(100)).length).toBe(40);
		expect(cleanName(undefined)).toBe("");
	});

	it("writes the portfolio as Markdown with the best fit and the levels", () => {
		const md = portfolioMarkdown(
			parseMe("docker-desktop3,vite2,npm1"),
			"Alex",
			"https://tool.test/portfolio?me=x",
		);
		expect(md).toContain("# Alex's developer portfolio");
		expect(md).toContain("**Know it well:** Docker Desktop");
		expect(md).toContain("Best fit:");
		expect(md).toContain("https://tool.test/portfolio?me=x");
	});
});

describe("portfolio pages", () => {
	it("shows the editor with no ratings, and a result for a shared link", async () => {
		const empty = await (await app.request("/portfolio")).text();
		expect(empty).toContain('class="rate"');
		expect(empty).not.toContain('id="result"');
		expect(empty).toContain('<script src="/portfolio.js" defer>');
		const shared = await (
			await app.request("/portfolio?me=docker-desktop3,vite2&name=Alex")
		).text();
		expect(shared).toContain('id="result"');
		expect(shared).toContain("Alex's portfolio");
		expect(shared).toContain("Best-fit roles");
		expect(shared).toContain('<meta name="robots" content="noindex">');
		expect(shared).toContain('data-level="3"');
	});

	it("escapes the name and ignores made-up tools", async () => {
		const html = await (
			await app.request("/portfolio?me=nope3&name=%3Cb%3Ex")
		).text();
		expect(html).not.toContain("<b>x");
		expect(html).toContain("0 rated");
	});

	it("serves the Markdown as a download", async () => {
		const res = await app.request("/portfolio.md?me=docker-desktop3&name=Alex");
		expect(res.headers.get("content-type")).toContain("text/markdown");
		expect(res.headers.get("content-disposition")).toContain("attachment");
		expect(await res.text()).toContain("Docker");
	});

	it("lets the page call publish.flisk.si and nothing else", async () => {
		const csp =
			(await app.request("/portfolio")).headers.get(
				"content-security-policy",
			) ?? "";
		expect(csp).toContain("connect-src https://publish.flisk.si");
		expect(csp).not.toContain("unsafe-eval");
	});

	it("starts the editor from every rating in the address, not only the tools on screen", async () => {
		const html = await (
			await app.request("/portfolio?me=docker-desktop3,vite2&family=ai-agents")
		).text();
		expect(html).toContain('data-me="docker-desktop3,vite2"');
		expect(PORTFOLIO_JS).toContain("root.dataset.me");
	});

	it("ships a script that parses, keeps ratings in the address and publishes only with a session", () => {
		expect(() => new Function(PORTFOLIO_JS)).not.toThrow();
		expect(PORTFOLIO_JS).toContain("history.replaceState");
		expect(PORTFOLIO_JS).toContain("/v1/me/space");
		expect(PORTFOLIO_JS).toContain("window.toolsToken");
	});
});
