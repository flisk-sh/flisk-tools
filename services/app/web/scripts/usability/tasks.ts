// Objective usability tasks: things a visitor tries to find, run in-process against the app. Each task says what a
// good answer looks like; the score is how high it ranks (reciprocal rank) and whether it is in the top five.
//   bun scripts/usability/tasks.ts          prints a table and the totals, exits 1 if success@5 is under 0.9
import { createApp } from "../../src/app";
import { type Entry, search } from "../../src/catalog";
import { resolveNames } from "../../src/views";

interface Task {
	id: string;
	/** What the visitor wants, in their words. */
	want: string;
	/** What they type. */
	q: string;
	filter?: { kind?: string; mcp?: boolean; group?: string };
	/** A listing is a good answer when this is true. */
	good: (e: Entry) => boolean;
}

const has = (e: Entry, w: string) =>
	`${e.name} ${e.id} ${e.tagline}`.toLowerCase().includes(w);

export const TASKS: Task[] = [
	{
		id: "mcp-browser",
		want: "an MCP server so my AI can drive a browser",
		q: "browser automation",
		filter: { mcp: true },
		good: (e) => e.id === "playwright-mcp",
	},
	{
		id: "compose",
		want: "Docker Compose",
		q: "docker compose",
		good: (e) => e.id === "docker-compose",
	},
	{
		id: "typo",
		want: "Kubernetes, typed with a typo",
		q: "kubernets",
		good: (e) => e.id === "kubernetes",
	},
	{
		id: "k8s",
		want: "Kubernetes, typed as k8s",
		q: "k8s",
		good: (e) => e.id === "kubernetes",
	},
	{
		id: "review-skill",
		want: "an agent skill for code review",
		q: "code review",
		filter: { kind: "skill" },
		good: (e) => e.category === "Review",
	},
	{
		id: "postgres",
		want: "something Postgres",
		q: "postgres",
		good: (e) => has(e, "postgres"),
	},
	{
		id: "claude",
		want: "Claude Code",
		q: "claude code",
		good: (e) => e.id === "claude-code",
	},
	{
		id: "terraform",
		want: "Terraform",
		q: "terraform",
		good: (e) => e.id === "terraform",
	},
	{
		id: "local-k8s",
		want: "a way to run Kubernetes locally",
		q: "local kubernetes",
		good: (e) => e.category === "Local Kubernetes",
	},
	{
		id: "agents",
		want: "a framework to build AI agents",
		q: "ai agent framework",
		good: (e) =>
			["langgraph", "crewai", "mastra", "openai-agents-sdk"].includes(e.id),
	},
	{
		id: "no-signup",
		want: "a tool that works offline, no account",
		q: "offline no account",
		good: (e) => (e.dx ?? []).includes("offline"),
	},
	{
		id: "readme",
		want: "check how good my README is",
		q: "readme",
		good: (e) => e.id === "readme-score",
	},
];

export function run() {
	const rows = TASKS.map((t) => {
		const r = search({ q: t.q, ...t.filter, page: 1 });
		const rank = r.items.findIndex(t.good) + 1;
		return { id: t.id, want: t.want, q: t.q, results: r.total, rank };
	});
	const mrr =
		rows.reduce((a, r) => a + (r.rank ? 1 / r.rank : 0), 0) / rows.length;
	const top5 =
		rows.filter((r) => r.rank > 0 && r.rank <= 5).length / rows.length;
	return { rows, mrr, top5 };
}

if (import.meta.main) {
	await main();
}
async function main() {
	const { rows, mrr, top5 } = run();
	for (const r of rows)
		console.log(
			`${r.rank ? (r.rank <= 5 ? "ok  " : "low ") : "MISS"} ${r.id.padEnd(13)} rank ${String(r.rank || "-").padStart(2)} of ${String(r.results).padStart(3)}  "${r.q}"  (${r.want})`,
		);
	// Ask: "yarn vs pnpm" must name both.
	const ask = resolveNames("yarn vs pnpm").length === 2;
	console.log(`ask compare yarn vs pnpm: ${ask ? "ok" : "MISS"}`);
	// The app answers every page the tasks reach.
	const app = createApp({ publicUrl: "https://tool.test/" });
	for (const p of [
		"/",
		"/ask?q=yarn+vs+pnpm",
		"/roles",
		"/journeys",
		"/portfolio",
		"/skills",
	]) {
		const s = (await app.request(p)).status;
		if (s !== 200) console.log(`PAGE ${p} -> ${s}`);
	}
	console.log(
		`\nMRR ${mrr.toFixed(2)}   success@5 ${(top5 * 100).toFixed(0)}%   (${rows.filter((r) => r.rank > 0 && r.rank <= 5).length}/${rows.length})`,
	);
	process.exit(top5 >= 0.9 ? 0 : 1);
}
