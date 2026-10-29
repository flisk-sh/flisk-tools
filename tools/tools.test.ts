import { describe, expect, it } from "bun:test";
import { links } from "./link-checker/main.ts";
import { detect, services } from "./stack-scanner/main.ts";

describe("stack-scanner", () => {
	const found = detect([
		"README.md",
		"Dockerfile",
		"services/api/Dockerfile",
		"services/api/package.json",
		"node_modules/x/package.json",
		"docker-compose.yml",
		"render.yaml",
	]);
	it("finds stack files and skips vendored folders", () => {
		expect(found.map((f) => f.kind)).toEqual(["Dockerfile", "Dockerfile", "package.json", "Compose", "render.yaml"]);
	});
	it("names a service per folder with its own Dockerfile or package.json", () => {
		expect(services(found)).toEqual([".", "services/api"]);
	});
});

describe("link-checker", () => {
	it("keeps absolute http(s) links once, resolves relative ones and drops fragments and mailto", () => {
		const html = '<a href="/a#top">a</a><a href="/a">again</a><a href="https://x.test/b">b</a><a href="mailto:me@x.test">m</a><a href="javascript:void(0)">j</a>';
		expect(links(html, "https://site.test/page")).toEqual(["https://site.test/a", "https://x.test/b"]);
	});
});
