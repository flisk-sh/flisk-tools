// Builds src/catalog.generated.json from catalog/*.json (arrays: Flisk's own apps and the roadmap import) and
// listings/<github login>--<id>.json (one entry each, added by pull request). Run it after any change to those folders;
// tests/catalog.test.ts fails when the generated file is out of date.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Entry, order, problem } from "../src/catalog";

const root = join(import.meta.dir, "../../../..");
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const files = (dir: string) =>
	readdirSync(join(root, dir))
		.filter((f) => f.endsWith(".json"))
		.sort();

const entries: Entry[] = [];
// catalog/ is read in name order, so flisk.json wins over the roadmap import when both list the same id.
const taken = new Set<string>();
for (const f of files("catalog").filter(
	(x) => x !== "overrides.json" && x !== "views.json",
))
	for (const e of read(join(root, "catalog", f)) as Entry[]) {
		if (taken.has(e.id)) continue;
		taken.add(e.id);
		entries.push(e);
	}
for (const f of files("listings")) {
	const m = /^([a-z0-9][a-z0-9-]{0,38})--(.+)\.json$/.exec(f);
	if (!m)
		throw new Error(`listings/${f}: name it <your github login>--<id>.json`);
	const e = read(join(root, "listings", f)) as Entry;
	if (e.id !== m[2]) throw new Error(`listings/${f}: id must be ${m[2]}`);
	if (e.kind === "skill" && !e.repo)
		throw new Error(`listings/${f}: a skill needs its repo`);
	entries.push({ ...e, author: m[1], official: false });
}

// catalog/overrides.json adds fields to an imported entry by id (the roadmap import is regenerated, so facts we add,
// like an MCP server, live here).
const overrides = read(join(root, "catalog", "overrides.json")) as Record<
	string,
	Partial<Entry>
>;
for (const [id, extra] of Object.entries(overrides)) {
	const e = entries.find((x) => x.id === id);
	if (!e) throw new Error(`catalog/overrides.json: no entry with id ${id}`);
	Object.assign(e, extra);
}

const ids = new Set<string>();
for (const e of entries) {
	const why = problem(e);
	if (why) throw new Error(`${e.id ?? "?"}: ${why}`);
	if (ids.has(e.id)) throw new Error(`${e.id}: listed twice`);
	ids.add(e.id);
}
entries.sort(order);
writeFileSync(
	join(import.meta.dir, "../src/catalog.generated.json"),
	`${JSON.stringify(entries)}\n`,
);
// The views data (rubric, roles, journeys) is copied next to the code, because the image ships src/ only.
writeFileSync(
	join(import.meta.dir, "../src/views.generated.json"),
	readFileSync(join(root, "catalog", "views.json"), "utf8"),
);
console.log(`Wrote ${entries.length} entries to src/catalog.generated.json`);
