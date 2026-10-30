// The real UMUX-Lite score of the store, from the issues visitors submitted on the Rate page.
//   bun scripts/umux.ts            (needs the GitHub CLI, signed in)
import { parseIssue, UMUX_LABEL, umuxAdjusted, umuxMean } from "../src/umux";

const repo = process.argv[2] ?? "flisk-sh/flisk-tools";
const out = Bun.spawnSync([
	"gh",
	"issue",
	"list",
	"--repo",
	repo,
	"--label",
	UMUX_LABEL,
	"--state",
	"all",
	"--limit",
	"1000",
	"--json",
	"number,body,createdAt",
]);
if (out.exitCode !== 0) {
	console.error(out.stderr.toString() || "gh failed");
	process.exit(1);
}
const issues = JSON.parse(out.stdout.toString()) as {
	number: number;
	body: string;
	createdAt: string;
}[];
const answers = issues
	.map((i) => parseIssue(i.body))
	.filter((a): a is NonNullable<typeof a> => Boolean(a));
const mean = umuxMean(answers);
if (mean === undefined) {
	console.log("No UMUX-Lite answers yet. Ask people to rate at /rate.");
	process.exit(0);
}
const avg = (k: "capabilities" | "easy") =>
	answers.reduce((s, a) => s + a[k], 0) / answers.length;
const sd = Math.sqrt(
	answers.reduce(
		(s, a) => s + (((a.capabilities + a.easy - 2) / 12) * 100 - mean) ** 2,
		0,
	) / Math.max(1, answers.length - 1),
);
const ci = answers.length > 1 ? 1.96 * (sd / Math.sqrt(answers.length)) : NaN;
console.log(`UMUX-Lite from ${answers.length} answers`);
console.log(
	`  capabilities meet my requirements: ${avg("capabilities").toFixed(2)} / 7`,
);
console.log(
	`  easy to use:                       ${avg("easy").toFixed(2)} / 7`,
);
console.log(
	`  score: ${mean.toFixed(1)} / 100${Number.isNaN(ci) ? "" : `  (95% interval ±${ci.toFixed(1)})`}`,
);
console.log(
	`  SUS-adjusted: ${umuxAdjusted({ capabilities: avg("capabilities"), easy: avg("easy") }).toFixed(1)} (68 is average, 80 is good)`,
);
