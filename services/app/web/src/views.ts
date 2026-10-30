// The data behind the Compass, Radar, Journeys, Roles, Skills and Ask views: the roadmap's rubric, families, roles and
// journeys (src/views.generated.json, from `bun scripts/import-roadmap.ts`) joined to the catalog's tools by id.
import { ENTRIES, type Entry, findEntry } from "./catalog";
import views from "./views.generated.json";

export interface Family {
	id: string;
	name: string;
	color: string;
	blurb: string;
}
export interface Criterion {
	id: string;
	label: string;
	help: string;
}
export interface Rubric {
	title: string;
	short: string;
	low: string;
	high: string;
	explain: string;
	criteria: Criterion[];
}
export interface Ring {
	id: "adopt" | "trial" | "assess" | "hold";
	label: string;
	help: string;
}
export interface Role {
	id: string;
	name: string;
	group: string;
	what: string;
	day: string[];
	core: string[];
	daily: string[];
	nice: string[];
}
export interface Level {
	n: number;
	id: string;
	name: string;
	goal: string;
	skills: string[];
	flisk?: { status: string; text: string };
}
export interface Track {
	id: string;
	name: string;
	blurb: string;
	stops: Record<string, { main: string[]; side: string[]; tip: string }>;
}

export const FAMILIES = views.families as Family[];
export const RINGS = views.rings as Ring[];
export const DX = views.dx as Rubric;
export const PARITY = views.parity as Rubric;
export const SKILL_CATEGORIES = views.skillCategories as {
	id: string;
	name: string;
	blurb: string;
}[];
export const ROLE_GROUPS = views.roles.groups as {
	id: string;
	name: string;
	blurb: string;
}[];
export const ROLES = views.roles.roles as unknown as Role[];
export const LEVELS = views.journeys.levels as unknown as Level[];
export const TRACKS = views.journeys.tracks as unknown as Track[];

/** The roadmap tools: the ones with a ring, family and rubric criteria. */
export const ROADMAP_TOOLS = ENTRIES.filter((e) => e.ring && e.family);

export const familyOf = (id: string) => FAMILIES.find((f) => f.id === id);

/** Compass position, 0 to 100: ten points for each "easy to use" check and each "big real systems" check. */
export const compass = (e: Entry) => ({
	x: (e.dx?.length ?? 0) * 10,
	y: (e.parity?.length ?? 0) * 10,
});

/** A stable number in [0, 1) for an id and a salt, so dots keep their place on every request. */
export function unit(id: string, salt: string): number {
	let h = 2166136261;
	for (const ch of `${salt}:${id}`)
		h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return ((h >>> 0) % 10000) / 10000;
}

/** A tool by id; the Flisk CLI is listed as an app but is a tool in roles and journeys, so apps count too. */
export const toolById = (id: string) => {
	const e = findEntry(id);
	return e?.kind === "skill" ? undefined : e;
};

/** "yarn vs npm, bun" -> the tools they name, best match first per word, no repeats. */
export function resolveNames(query: string, limit = 5): Entry[] {
	const names = query
		.split(/\s+(?:vs\.?|versus|and|against)\s+|[,;|/]|\s{2,}/i)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const out: Entry[] = [];
	for (const n of names) {
		const slug = n.replace(/[^a-z0-9]+/g, "-");
		const pool = ENTRIES.filter((e) => e.kind === "tool" || e.kind === "app");
		const hit =
			pool.find((e) => e.id === slug || e.name.toLowerCase() === n) ??
			pool.find(
				(e) => e.id.startsWith(slug) || e.name.toLowerCase().startsWith(n),
			) ??
			pool.find((e) => e.name.toLowerCase().includes(n));
		if (hit && !out.includes(hit)) out.push(hit);
		if (out.length >= limit) break;
	}
	return out;
}
