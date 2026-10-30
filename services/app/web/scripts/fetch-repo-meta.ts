// Fetches when each tool's GitHub repository was created and whether it is archived, into catalog/repo-meta.json, so
// listings can say how long a tool has existed. Needs the GitHub CLI, signed in (about 350 calls).
//   bun scripts/fetch-repo-meta.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Entry } from "../src/catalog";

const root = join(import.meta.dir, "../../../..");
const tools = (
	JSON.parse(
		await Bun.file(join(root, "catalog/roadmap.json")).text(),
	) as Entry[]
).filter((e) => e.kind === "tool" && e.repo);
const out: Record<string, { created: string; archived: boolean }> = {};
let next = 0;
async function worker() {
	while (next < tools.length) {
		const e = tools[next++];
		const p = Bun.spawn(
			[
				"gh",
				"api",
				`repos/${e.repo}`,
				"--jq",
				"{created: .created_at, archived: .archived}",
			],
			{ stdout: "pipe", stderr: "ignore" },
		);
		const text = await new Response(p.stdout).text();
		try {
			const j = JSON.parse(text) as { created?: string; archived?: boolean };
			if (j.created)
				out[e.id] = {
					created: j.created.slice(0, 10),
					archived: Boolean(j.archived),
				};
		} catch {
			// a repository that moved or was deleted keeps no entry
		}
	}
}
await Promise.all(Array.from({ length: 8 }, worker));
writeFileSync(
	join(root, "catalog/repo-meta.json"),
	`${JSON.stringify(out, null, "\t")}\n`,
);
console.log(
	`Wrote ${Object.keys(out).length} of ${tools.length} repositories to catalog/repo-meta.json`,
);
