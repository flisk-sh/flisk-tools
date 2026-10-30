// Copies the tools and agent skills of flisk-sh/roadmap into catalog/roadmap.json, the way the store lists them.
//   bun scripts/import-roadmap.ts ../path/to/roadmap
// Then `bun run catalog` builds src/catalog.generated.json from catalog/ and listings/.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Entry } from "../src/catalog";

const dir = resolve(process.argv[2] ?? "");
if (!process.argv[2]) {
	console.error(
		"Usage: bun scripts/import-roadmap.ts <path to a flisk-sh/roadmap checkout>",
	);
	process.exit(1);
}
const yaml = (file: string) =>
	Bun.YAML.parse(readFileSync(join(dir, "_data", file), "utf8")) as Record<
		string,
		unknown
	>[];
const json = (file: string) =>
	JSON.parse(readFileSync(join(dir, "_data", file), "utf8"));

const families = new Map(
	yaml("families.yml").map((f) => [f.id, f.name as string]),
);
const github = json("github.json").tools as Record<string, { stars?: number }>;
const skillRepos = json("skill_repos.json").repos as Record<
	string,
	{ stars?: number }
>;
const skillCats = new Map(
	yaml("skill_categories.yml").map((c) => [c.id, c.name as string]),
);

const entries: Entry[] = [];
const seen = new Set<string>();
const add = (e: Entry) => {
	let id = e.id;
	while (seen.has(id)) id = `${id}-${e.kind}`;
	seen.add(id);
	entries.push({ ...e, id });
};

for (const file of readdirSync(join(dir, "_data/tools")).filter((f) =>
	f.endsWith(".yml"),
)) {
	const family = file.replace(/\.yml$/, "");
	for (const t of yaml(`tools/${file}`)) {
		add({
			kind: "tool",
			id: String(t.id),
			name: String(t.name),
			tagline: String(t.tagline ?? ""),
			description: String(t.note ?? t.tagline ?? ""),
			group: families.get(family) ?? family,
			category: String(t.cat ?? ""),
			url: String(t.url),
			repo: t.repo ? String(t.repo) : undefined,
			stars: github[String(t.id)]?.stars,
			license: t.license ? String(t.license) : undefined,
			author: String(t.repo ?? "").split("/")[0] || undefined,
			family,
			ring: t.ring as Entry["ring"],
			dx: (t.dx as string[]) ?? [],
			parity: (t.parity as string[]) ?? [],
		});
	}
}
for (const file of readdirSync(join(dir, "_data/skills")).filter((f) =>
	f.endsWith(".yml"),
)) {
	for (const s of yaml(`skills/${file}`)) {
		const source = String(s.source);
		add({
			kind: "skill",
			id: String(s.id),
			name: String(s.name),
			tagline: String(s.what).slice(0, 110),
			description: String(s.what),
			group: "Agent skills",
			category: skillCats.get(s.cat) ?? String(s.cat),
			url: `https://github.com/${source}/blob/HEAD/${s.path}`,
			repo: source,
			stars: skillRepos[source]?.stars,
			license:
				s.license && s.license !== "unknown" ? String(s.license) : undefined,
			author: source.split("/")[0],
		});
	}
}
// The rubric, rings, families, roles, journeys and skill categories behind the Compass, Radar, Journeys, Roles and
// Skills views.
const parse = (file: string) =>
	Bun.YAML.parse(readFileSync(join(dir, "_data", file), "utf8")) as Record<
		string,
		unknown
	>;
const rubric = parse("rubric.yml");
const views = {
	families: yaml("families.yml").map((f) => ({
		id: f.id,
		name: f.name,
		color: f.color,
		blurb: f.blurb,
	})),
	rings: rubric.rings,
	dx: rubric.dx,
	parity: rubric.parity,
	skillCategories: yaml("skill_categories.yml"),
	roles: parse("roles.yml"),
	journeys: parse("journeys.yml"),
};
writeFileSync(
	join(import.meta.dir, "../../../../catalog/views.json"),
	`${JSON.stringify(views)}\n`,
);
writeFileSync(
	join(import.meta.dir, "../../../../catalog/roadmap.json"),
	`${JSON.stringify(entries, null, "\t")}\n`,
);
console.log(
	`Wrote ${entries.length} entries (${entries.filter((e) => e.kind === "tool").length} tools, ${entries.filter((e) => e.kind === "skill").length} skills) to catalog/roadmap.json`,
);
