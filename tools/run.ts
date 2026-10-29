// Runs one Tool inside the run-tool.yml workflow and writes out/<ticket>.json, which the workflow then publishes to
// the fork's `results` branch. Settings come from the environment, never from the command line:
//   TOOL   the folder name under tools/
//   INPUT   the Tool's input as JSON
//   TICKET  a random id the console chose, so it can find this run's result
import { mkdirSync, writeFileSync } from "node:fs";

const tool = process.env.TOOL ?? "";
const ticket = process.env.TICKET ?? "";
if (!/^[a-z0-9-]+$/.test(tool) || !/^[a-f0-9]{8,32}$/.test(ticket)) {
	console.error("TOOL and TICKET are missing or malformed.");
	process.exit(1);
}

const startedAt = new Date().toISOString();
let input: unknown = {};
let record: { ok: boolean; result?: unknown; error?: string };
try {
	input = JSON.parse(process.env.INPUT || "{}");
	const main = (await import(`./${tool}/main.ts`)).default as (
		input: Record<string, string>,
	) => Promise<unknown>;
	record = { ok: true, result: await main(input as Record<string, string>) };
} catch (e) {
	record = { ok: false, error: e instanceof Error ? e.message : String(e) };
}

mkdirSync("out", { recursive: true });
writeFileSync(
	`out/${ticket}.json`,
	`${JSON.stringify({ tool, ticket, startedAt, finishedAt: new Date().toISOString(), input, ...record }, null, 2)}\n`,
);
console.log(`${tool}: ${record.ok ? "ok" : `failed: ${record.error}`}`);
