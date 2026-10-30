// The store's catalog: Flisk's own apps, the tools and agent skills of the DevEx Roadmap, and listings that people
// add with a pull request. It is one JSON file built from catalog/*.json and listings/*.json (`bun run catalog`), so
// the site needs no database and a listing is a reviewed file in git.
import data from "./catalog.generated.json";

export type Kind = "app" | "tool" | "skill";

/** How to reach a listing's MCP server: a remote one by address, or a local one by command. */
export interface Mcp {
	transport: "http" | "stdio";
	/** https address of a remote (Streamable HTTP) server. */
	url?: string;
	/** What to run for a local (stdio) server, like "flisk mcp". */
	command?: string;
	/** Tool names the server offers. */
	tools?: string[];
	/** Name in the official MCP Registry, when it is listed there. */
	registry?: string;
}

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
	/** Set when the listing also has an MCP server an AI can use. */
	mcp?: Mcp;
	/** Roadmap tools only: the family id, the Radar ring and the criteria behind the Compass position. */
	family?: string;
	ring?: "adopt" | "trial" | "assess" | "hold";
	dx?: string[];
	parity?: string[];
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
	category?: string;
	/** Only listings that have an MCP server. */
	mcp?: boolean;
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
			(!query.category || e.category === query.category) &&
			(!query.mcp || e.mcp) &&
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

export const mcpCount = () => ENTRIES.filter((e) => e.mcp).length;

/** The Claude Code command that adds a listing's MCP server. */
export function mcpCommand(e: Pick<Entry, "id" | "mcp">): string {
	const m = e.mcp;
	if (!m) return "";
	return m.transport === "http"
		? `claude mcp add --transport http ${e.id} ${m.url}`
		: `claude mcp add ${e.id} -- ${m.command}`;
}

export const counts = (kind: Kind) =>
	ENTRIES.filter((e) => e.kind === kind).length;

export const order = (a: Entry, b: Entry) =>
	Number(b.official ?? false) - Number(a.official ?? false) ||
	(b.stars ?? 0) - (a.stars ?? 0) ||
	a.name.localeCompare(b.name);

/** The text for MCP and llms.txt. */
export function describeEntry(e: Entry): string {
	const mcp = e.mcp
		? ` MCP server: ${e.mcp.transport === "http" ? e.mcp.url : `local, run \`${e.mcp.command}\``}${e.mcp.tools?.length ? ` (tools: ${e.mcp.tools.join(", ")})` : ""}.`
		: "";
	return `${e.name} (${e.id}, ${kindLabel(e.kind)}): ${e.tagline}. ${e.description} ${e.url}${e.stars ? ` · ${e.stars} stars` : ""}.${mcp}`;
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
	const m = e.mcp;
	if (m) {
		if (m.transport !== "http" && m.transport !== "stdio")
			return "mcp.transport must be http or stdio";
		if (m.transport === "http" && !/^https:\/\/[^\s"'<>]+$/.test(m.url ?? ""))
			return "mcp.url must be an https address";
		if (
			m.transport === "stdio" &&
			!/^[\w@./:= -]{1,120}$/.test(m.command ?? "")
		)
			return "mcp.command may use letters, digits and @ . / : = - only";
		if (
			m.tools &&
			(m.tools.length > 40 || m.tools.some((t) => !/^[\w.-]{1,60}$/.test(t)))
		)
			return "mcp.tools must be up to 40 plain names";
		if (m.registry && !/^[\w.-]+\/[\w.-]+$/.test(m.registry))
			return "mcp.registry must look like io.github.you/name";
	}
	return undefined;
}

/** The two-letter symbol on a tile, like an element: "claude-api" is Ca, "LangGraph" is La. */
export function symbol(e: Pick<Entry, "name">): string {
	const words = e.name.split(/[^A-Za-z0-9]+/).filter(Boolean);
	const [a = "?", b = ""] = words;
	const second = words.length > 1 ? b[0] : a[1];
	return a[0].toUpperCase() + (second ?? "").toLowerCase();
}

/** A stable color for a group or category, as a hue. */
export function hue(name: string): number {
	let h = 7;
	for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
	return h;
}
