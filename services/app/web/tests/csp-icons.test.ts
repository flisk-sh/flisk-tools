import { describe, expect, it } from "bun:test";
import worker from "../src/worker";

const ctx = { waitUntil() {} };
const env = { PUBLIC_URL: "https://tools.flisk.si/" };

const images = (policy: string | null) =>
	(policy?.match(/(?:^|;)\s*img-src\s+([^;]+)/)?.[1] ?? "").trim().split(/\s+/);

describe("org bar icons", () => {
	it.each(["/", "/about"])(
		"lets %s load the icons on flisk.si",
		async (path) => {
			const res = await worker.fetch(
				new Request(`https://tools.flisk.si${path}`),
				env,
				ctx,
			);
			expect(res.status).toBe(200);
			const sources = images(res.headers.get("content-security-policy"));
			expect(sources).toContain("https://flisk.si");
		},
	);

	it("keeps the policy strict: no wildcard or scheme-wide image source", async () => {
		const res = await worker.fetch(
			new Request("https://tools.flisk.si/"),
			env,
			ctx,
		);
		const sources = images(res.headers.get("content-security-policy"));
		expect(sources).toContain("'self'");
		expect(sources).not.toContain("*");
		expect(sources).not.toContain("https:");
	});
});
