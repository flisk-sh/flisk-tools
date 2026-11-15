import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../../..");

describe("GitHub issue templates", () => {
	it(".github/ISSUE_TEMPLATE/bug_report.yml exists and asks for URL, steps, and expected result", () => {
		const bugReportPath = join(root, ".github/ISSUE_TEMPLATE/bug_report.yml");
		expect(existsSync(bugReportPath)).toBe(true);

		const content = readFileSync(bugReportPath, "utf8");
		expect(content).toMatch(/label:\s*URL/i);
		expect(content).toMatch(/Steps to reproduce/i);
		expect(content).toMatch(/Expected result/i);
	});

	it(".github/ISSUE_TEMPLATE/config.yml exists and points questions to Discussions or README", () => {
		const configPath = join(root, ".github/ISSUE_TEMPLATE/config.yml");
		expect(existsSync(configPath)).toBe(true);

		const content = readFileSync(configPath, "utf8");
		expect(content).toMatch(/discussions/i);
		expect(content).toMatch(/readme/i);
	});
});

describe("GitHub pull request template", () => {
	it(".github/PULL_REQUEST_TEMPLATE.md exists and asks for a summary and test command run", () => {
		const prTemplatePath = join(root, ".github/PULL_REQUEST_TEMPLATE.md");
		expect(existsSync(prTemplatePath)).toBe(true);

		const content = readFileSync(prTemplatePath, "utf8");
		expect(content).toMatch(/what changed|summary/i);
		expect(content).toMatch(/how did you check it|test command|tests run/i);
	});
});
