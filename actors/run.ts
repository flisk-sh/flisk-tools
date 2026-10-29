// Runs one Actor inside the run-actor.yml workflow and writes out/<ticket>.json, which the workflow then publishes to
// the fork's `results` branch. Settings come from the environment, never from the command line:
//   ACTOR   the folder name under actors/
//   INPUT   the Actor's input as JSON
//   TICKET  a random id the console chose, so it can find this run's result
import { mkdirSync, writeFileSync } from "node:fs";

const actor = process.env.ACTOR ?? "";
const ticket = process.env.TICKET ?? "";
if (!/^[a-z0-9-]+$/.test(actor) || !/^[a-f0-9]{8,32}$/.test(ticket)) {
	console.error("ACTOR and TICKET are missing or malformed.");
	process.exit(1);
}

const startedAt = new Date().toISOString();
let input: unknown = {};
let record: { ok: boolean; result?: unknown; error?: string };
try {
	input = JSON.parse(process.env.INPUT || "{}");
	const main = (await import(`./${actor}/main.ts`)).default as (
		input: Record<string, string>,
	) => Promise<unknown>;
	record = { ok: true, result: await main(input as Record<string, string>) };
} catch (e) {
	record = { ok: false, error: e instanceof Error ? e.message : String(e) };
}

mkdirSync("out", { recursive: true });
writeFileSync(
	`out/${ticket}.json`,
	`${JSON.stringify({ actor, ticket, startedAt, finishedAt: new Date().toISOString(), input, ...record }, null, 2)}\n`,
);
console.log(`${actor}: ${record.ok ? "ok" : `failed: ${record.error}`}`);
