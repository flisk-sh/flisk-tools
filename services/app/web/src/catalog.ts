// The store's catalog: Flisk's own apps, the tools and agent skills of the DevEx Roadmap, and listings that people
// add with a pull request. It is one JSON file built from catalog/*.json and listings/*.json (`bun run catalog`), so
// the site needs no database and a listing is a reviewed file in git.
import data from "./catalog.generated.json";

export type Kind = "app" | "tool" | "skill";

export interface Entry {
	kind: Kind;
	id: string;
	name: string;
	tagline: string;
	description: string;
	/** The family a tool belongs to ("Inner loop"), "Agent skills", or "Flisk apps". */
	group: string;
	category: string;
	url: string;
	/** owner/name on GitHub, when there is one. */
	repo?: string;
	stars?: number;
	license?: string;
	/** A GitHub login or organization. */
	author?: string;
	/** Listed by Flisk itself. */
	official?: boolean;
}

export const KINDS: { id: Kind; label: string; plural: string }[] = [
	{ id: "app", label: "App", plural: "Apps" },
	{ id: "tool", label: "Dev tool", plural: "Dev tools" },
	{ id: "skill", label: "Agent skill", plural: "Agent skills" },
];

export const ENTRIES = data as Entry[];
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const findEntry = (id: string) => BY_ID.get(id);
export const kindLabel = (k: Kind) => KINDS.find((x) => x.id === k)?.label ?? k;

export const PAGE_SIZE = 24;

export interface Query {
	q?: string;
	kind?: string;
	group?: string;
	page?: number;
}

export interface Result {
	items: Entry[];
	total: number;
	page: number;
	pages: number;
}

const haystack = (e: Entry) =>
	`${e.name} ${e.tagline} ${e.category} ${e.group} ${e.author ?? ""} ${e.repo ?? ""}`.toLowerCase();
const HAY = new Map(ENTRIES.map((e) => [e.id, haystack(e)]));

/** Official first, then by stars, then by name. Entries are already in that order. */
export function search(query: Query): Result {
	const words = (query.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
	const matches = ENTRIES.filter(
		(e) =>
			(!query.kind || e.kind === query.kind) &&
			(!query.group || e.group === query.group) &&
			words.every((w) => HAY.get(e.id)?.includes(w)),
	);
	const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, Math.floor(query.page ?? 1) || 1), pages);
	return {
		items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		total: matches.length,
		page,
		pages,
	};
}

/** The groups of one kind (or all), with how many entries each holds, biggest first. */
export function groups(kind?: string): { name: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const e of ENTRIES)
		if (!kind || e.kind === kind)
			counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
	return [...counts]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
}

export const counts = (kind: Kind) =>
	ENTRIES.filter((e) => e.kind === kind).length;

export const order = (a: Entry, b: Entry) =>
	Number(b.official ?? false) - Number(a.official ?? false) ||
	(b.stars ?? 0) - (a.stars ?? 0) ||
	a.name.localeCompare(b.name);

/** The text for MCP and llms.txt. */
export function describeEntry(e: Entry): string {
	return `${e.name} (${e.id}, ${kindLabel(e.kind)}): ${e.tagline}. ${e.description} ${e.url}${e.stars ? ` · ${e.stars} stars` : ""}`;
}

/** What is wrong with a catalog entry, or undefined. Used by `bun run catalog` and the tests. */
export function problem(e: Partial<Entry>): string | undefined {
	if (!e.kind || !KINDS.some((k) => k.id === e.kind))
		return "kind must be app, tool or skill";
	if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(e.id ?? ""))
		return "id must be lowercase letters, digits and dashes";
	if (!e.name || e.name.length > 60)
		return "name is required, 60 characters at most";
	if (!e.tagline || e.tagline.length > 120)
		return "tagline is required, 120 characters at most";
	if (!e.description || e.description.length > 600)
		return "description is required, 600 characters at most";
	if (!e.group || !e.category) return "group and category are required";
	if (!/^https:\/\/[^\s"'<>]+$/.test(e.url ?? ""))
		return "url must be an https address";
	if (e.repo && !/^[\w.-]+\/[\w.-]+$/.test(e.repo))
		return "repo must look like owner/name";
	return undefined;
}
