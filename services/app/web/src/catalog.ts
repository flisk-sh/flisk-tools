// The store's catalog: Flisk's own apps, the tools and agent skills of the DevEx Roadmap, and listings that people
// add with a pull request. It is one JSON file built from catalog/*.json and listings/*.json (`bun run catalog`), so
// the site needs no database and a listing is a reviewed file in git.
import data from "./catalog.generated.json";
import views from "./views.generated.json";

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
	/** Roadmap tools: the dates and version GitHub reported when the data was fetched. */
	pushed?: string;
	release?: string;
	version?: string;
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
	/** Only roadmap tools in this Radar ring. */
	ring?: string;
	/** Only tools that meet this "easy to use" check, like "offline" or "agent-ready". */
	check?: string;
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

// ---- Search -------------------------------------------------------------------------------------------------------
// Relevance, not popularity: a word in the name beats a word in the description; a typo within one or two letters still
// matches; "k8s" means Kubernetes; and the roadmap's checks are searchable ("offline" finds tools that need no account).
// A listing needs at least half of the words, and the more words it has, the higher it ranks.

const STOP = new Set([
	"a",
	"an",
	"the",
	"for",
	"to",
	"of",
	"my",
	"me",
	"i",
	"in",
	"on",
	"with",
	"and",
	"or",
	"is",
	"that",
	"how",
	"can",
	"do",
	"want",
	"need",
	"find",
	"tool",
	"tools",
	"app",
	"apps",
	"no",
	"such",
	"thing",
	"things",
	"best",
	"good",
	"new",
	"some",
	"something",
	"any",
	"vs",
	"versus",
]);

/** Words people type for other words. Each side finds the other. */
const SYNONYMS: Record<string, string[]> = {
	k8s: ["kubernetes"],
	kube: ["kubernetes"],
	js: ["javascript", "node"],
	ts: ["typescript"],
	py: ["python"],
	golang: ["go"],
	postgres: ["postgresql", "postgres"],
	pg: ["postgres"],
	db: ["database"],
	ci: ["ci/cd", "continuous"],
	cd: ["ci/cd", "deploy"],
	llm: ["model", "ai"],
	agent: ["agents", "agentic"],
	agents: ["agent"],
	browser: ["playwright", "puppeteer", "chrome"],
	automation: ["automate", "automated", "playwright", "script"],
	review: ["reviews", "reviewing", "pr"],
	container: ["containers", "docker"],
	offline: ["local", "no account"],
	laptop: ["local"],
	locally: ["local"],
	local: ["laptop"],
	test: ["testing", "tests"],
	docs: ["documentation"],
	secret: ["secrets"],
	monorepo: ["monorepos", "workspace"],
	vm: ["virtual"],
	mac: ["macos"],
};

const DX_LABELS: Record<string, string> = Object.fromEntries(
	(
		(views.dx as { criteria: { id: string; label: string }[] }).criteria ?? []
	).map((c) => [c.id, c.label.toLowerCase()]),
);
const PARITY_LABELS: Record<string, string> = Object.fromEntries(
	(
		(views.parity as { criteria: { id: string; label: string }[] }).criteria ??
		[]
	).map((c) => [c.id, c.label.toLowerCase()]),
);

const stem = (w: string) =>
	w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
const tokens = (s: string) =>
	s
		.toLowerCase()
		.split(/[^a-z0-9+#]+/)
		.filter(Boolean)
		.map(stem);

interface Doc {
	name: string[];
	id: string;
	main: string[];
	/** The one-liner's words: the best evidence after the name. */
	tag: string[];
	/** The category's words, a little weaker than the one-liner. */
	cat: string[];
	rest: string[];
	flat: string;
}
const DOCS = new Map<string, Doc>(
	ENTRIES.map((e) => {
		const checks = [
			...(e.dx ?? []).map((i) => DX_LABELS[i] ?? ""),
			...(e.parity ?? []).map((i) => PARITY_LABELS[i] ?? ""),
		].join(" ");
		const main = tokens(
			`${e.tagline} ${e.category} ${e.group} ${e.author ?? ""} ${e.repo ?? ""} ${kindLabel(e.kind)} ${e.mcp ? "mcp" : ""}`,
		);
		const rest = tokens(`${e.description} ${checks}`);
		return [
			e.id,
			{
				name: tokens(e.name),
				id: e.id.toLowerCase(),
				main,
				tag: tokens(e.tagline),
				cat: tokens(e.category),
				rest,
				flat: `${e.name} ${e.tagline}`.toLowerCase(),
			},
		];
	}),
);

/** Edit distance up to `max`, or max + 1 when it is more. Small and fast enough for a few thousand comparisons. */
function distance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const cur = [i];
		let low = i;
		for (let j = 1; j <= b.length; j++) {
			cur[j] = Math.min(
				prev[j] + 1,
				cur[j - 1] + 1,
				prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
			low = Math.min(low, cur[j]);
		}
		if (low > max) return max + 1;
		prev = cur;
	}
	return prev[b.length];
}

/** How well one query word matches a listing: 0 for no match. */
function wordScore(doc: Doc, word: string): number {
	const options = [word, ...(SYNONYMS[word] ?? [])];
	let best = 0;
	for (const [i, w0] of options.entries()) {
		const w = stem(w0);
		const weight = i === 0 ? 1 : 0.85;
		let s = 0;
		if (doc.name.includes(w) || doc.id === w) s = 10;
		else if (doc.name.some((t) => t.startsWith(w))) s = 7;
		else if (doc.id.includes(w) || doc.name.some((t) => t.includes(w))) s = 5;
		else if (doc.tag.includes(w)) s = 3.6;
		else if (doc.cat.includes(w)) s = 2.8;
		else if (doc.main.includes(w)) s = 2.4;
		else if (doc.main.some((t) => t.startsWith(w))) s = 2.2;
		else if (doc.rest.includes(w)) s = 1.2;
		else if (w.length >= 4) {
			const max = w.length >= 8 ? 2 : 1;
			if (doc.name.some((t) => t.length >= 4 && distance(w, t, max) <= max))
				s = 4;
			else if (
				doc.main.some((t) => t.length >= 4 && distance(w, t, max) <= max)
			)
				s = 1.5;
		}
		best = Math.max(best, s * weight);
	}
	return best;
}

const haystackOk = (e: Entry, q: Query) =>
	(!q.kind || e.kind === q.kind) &&
	(!q.group || e.group === q.group) &&
	(!q.category || e.category === q.category) &&
	(!q.ring || e.ring === q.ring) &&
	(!q.check || (e.dx ?? []).includes(q.check)) &&
	(!q.mcp || e.mcp);

/** Every listing that matches, best first: official, then by stars, then by name with no query; by relevance with one. */
export function rank(query: Query): Entry[] {
	const words = tokens(query.q ?? "").filter((w) => !STOP.has(w));
	const pool = ENTRIES.filter((e) => haystackOk(e, query));
	let matches: Entry[];
	if (words.length === 0)
		matches =
			(query.q ?? "").trim() && tokens(query.q ?? "").length ? [] : pool;
	else {
		const phrase = words.join(" ");
		// Half the words must match; if that finds fewer than three, any one word will do ("yarn pnpm bun" names three tools).
		const needs = words.length > 1 ? [Math.ceil(words.length / 2), 1] : [1];
		let scored: { e: Entry; s: number }[] = [];
		for (const need of needs) {
			scored = [];
			for (const e of pool) {
				const doc = DOCS.get(e.id);
				if (!doc) continue;
				let sum = 0;
				let hit = 0;
				let strong = 0;
				for (const w of words) {
					const s = wordScore(doc, w);
					if (s > 0) {
						hit++;
						sum += s;
						// A real match is a word in the name or the one-liner, not a loose typo of something in the description.
						if (s >= 2.2) strong++;
					}
				}
				if (hit < need || strong === 0) continue;
				const coverage = hit / words.length;
				let s = sum * (0.4 + 0.6 * coverage);
				if (words.length > 1 && doc.flat.includes(phrase)) s += 8;
				// The name is exactly what was typed: it is the thing they are looking for. Extra words in a name count against it.
				const inName = words.filter((w) => doc.name.includes(stem(w))).length;
				if (inName === words.length) {
					const extra = doc.name.length - words.length;
					s += extra === 0 ? 30 : -Math.min(6, extra * 1.5);
				}
				scored.push({ e, s });
			}
			if (scored.length >= 3) break;
		}
		// Ties go to official listings, then the most-starred, so the popular tool wins when two match equally well.
		scored.sort(
			(a, b) =>
				b.s - a.s ||
				Number(b.e.official ?? false) - Number(a.e.official ?? false) ||
				(b.e.stars ?? 0) - (a.e.stars ?? 0),
		);
		// Drop the loose tail: anything far weaker than the best match, but always keep the first ten.
		const best = scored[0]?.s ?? 0;
		const kept = scored.filter((x, i) => i < 10 || x.s >= best * 0.22);
		matches = kept.map((x) => x.e);
	}
	return matches;
}

export function search(query: Query): Result {
	const matches = rank(query);
	const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, Math.floor(query.page ?? 1) || 1), pages);
	return {
		items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		total: matches.length,
		page,
		pages,
	};
}

/** How many listings match the query in each kind and each group, so the tabs show what a click would find. */
export function facets(query: Query): {
	kinds: Record<string, number>;
	groups: { name: string; count: number }[];
	total: number;
} {
	const kinds: Record<string, number> = {};
	for (const e of rank({
		...query,
		kind: undefined,
		group: undefined,
		category: undefined,
		page: undefined,
	}))
		kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
	const counts = new Map<string, number>();
	const forGroups = rank({
		...query,
		group: undefined,
		category: undefined,
		page: undefined,
	});
	for (const e of forGroups)
		counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
	return {
		kinds,
		groups: [...counts]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count),
		total: Object.values(kinds).reduce((a, b) => a + b, 0),
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
