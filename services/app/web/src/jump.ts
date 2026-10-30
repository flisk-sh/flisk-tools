// "Jump to": when a search also names a role, a journey or two tools, say so, because those answers live on other tabs
// and a search that finds nothing there feels like the store does not know.
import { ENTRIES } from "./catalog";
import { LEVELS, ROLES, resolveNames, TRACKS } from "./views";

export interface Jump {
	label: string;
	href: string;
	kind: "role" | "journey" | "compare";
}

const STOP = new Set([
	"a",
	"an",
	"the",
	"for",
	"to",
	"of",
	"my",
	"i",
	"in",
	"on",
	"with",
	"and",
	"or",
	"how",
	"become",
	"path",
	"learn",
	"learning",
	"job",
	"role",
	"roles",
]);
const words = (s: string) =>
	s
		.toLowerCase()
		.split(/[^a-z0-9+#]+/)
		.filter((w) => w && !STOP.has(w));
const norm = (w: string) =>
	w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w;

export function jumpLinks(q: string | undefined, root: string): Jump[] {
	const ws = words(q ?? "").map(norm);
	if (!ws.length) return [];
	const out: Jump[] = [];
	for (const r of ROLES) {
		const rw = words(r.name).map(norm);
		if (
			ws.every((w) => rw.includes(w) || r.name.toLowerCase().includes(w)) &&
			ws.some((w) => w.length >= 4)
		)
			out.push({
				kind: "role",
				label: `Role: ${r.name}`,
				href: `${root}/roles?group=${r.group}#${r.id}`,
			});
	}
	for (const t of TRACKS) {
		const tw = words(`${t.name} ${t.blurb}`).map(norm);
		if (
			ws.every((w) => tw.includes(w)) ||
			ws.every((w) => words(t.name).map(norm).includes(w))
		)
			out.push({
				kind: "journey",
				label: `Learning path: ${t.name}`,
				href: `${root}/journeys?track=${t.id}`,
			});
	}
	for (const l of LEVELS) {
		const lw = words(l.name).map(norm);
		if (
			ws.length >= 1 &&
			ws.every((w) => lw.includes(w)) &&
			ws.some((w) => w.length >= 4)
		)
			out.push({
				kind: "journey",
				label: `Level: ${l.name}`,
				href: `${root}/journeys#${l.id}`,
			});
	}
	const tools = resolveNames(q ?? "", 4).filter((e) => ENTRIES.includes(e));
	if (
		tools.length >= 2 ||
		(tools.length >= 1 && /\bvs\.?\b|\bversus\b/i.test(q ?? ""))
	)
		if (tools.length >= 2)
			out.push({
				kind: "compare",
				label: `Compare ${tools.map((t) => t.name).join(", ")} side by side`,
				href: `${root}/ask?q=${encodeURIComponent(tools.map((t) => t.name).join(" vs "))}`,
			});
	return out.slice(0, 5);
}
