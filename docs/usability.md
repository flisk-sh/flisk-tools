# Usability testing

Three ways the store is tested for usefulness. Only the third involves real people.

## 1. Task checks (objective, runs in CI)

`bun scripts/usability/tasks.ts` (and `tests/usability.test.ts`) run 12 things a visitor looks for, like "Kubernetes typed
as k8s" or "an MCP server so my AI can drive a browser", and score where the right answer ranks. Mean reciprocal rank
and success at the top 5 are printed; the test fails if success drops under 90%.

| | before | after |
| --- | --- | --- |
| mean reciprocal rank | 0.38 | 0.94 |
| success in the top 5 | 58% (7 of 12) | 100% (12 of 12) |

## 2. Simulated visitors (an AI playing a persona; not a UMUX-Lite from people)

Three personas (Maya, a backend developer who uses Claude Code; Jon, a junior developer; Priya, a tech lead who also
publishes a tool) each tried four tasks on a local copy, reading pages as text through `scripts/usability/text.ts`, then
rated the two UMUX-Lite statements from 1 to 7. Score = (capabilities + easy - 2) / 12 x 100.

These are language-model participants. They are useful for finding friction (every loop turned up real bugs) and poor
as a measurement: the first runs used a small model whose ratings sat at 4 no matter what changed, so later loops used
a stronger one. One participant per loop in loops 4 to 10, so a single score moves by 8 points on one answer.

| loop | what changed | simulated UMUX-Lite | tasks done | page views |
| --- | --- | --- | --- | --- |
| 0 (small model) | baseline | Maya 58, Jon 50, Priya 50 (mean 53) | 11 of 12 | about 45 |
| 1 (small model) | relevance search, jump links, filters | 58, 50, 50 (mean 53) | 12 of 12 | about 27 |
| 2 | stronger model: same build plus role finder, maturity facts | 67, 50, 67 (mean 61) | 11 of 12 | about 19 |
| 3 | route cards, compare verdict, rules | 67, 67, 67 (mean 67) | 12 of 12 | about 17 |
| 4 | role-percentage bands, consistent counts | Jon 67 | 4 of 4 | 9 |
| 5 | best-fit sentence, route names | Priya 58 | 4 of 4 | 8 |
| 6 | ring evidence, category filter | Maya 75 | 4 of 4 | 7 |
| 7 | sort by stars, skill install | Jon 67 | 4 of 4 | 9 |
| 8 | where-do-I-start, easiest sort | Priya 50 | 4 of 4 | 9 |
| 9 | full single-word results, category chips | Maya 75 | 4 of 4 | 9 |
| 10 | MCP pill, one-line skill install, compare top 3 | Jon 58 | 2 of 4 | 10 |
| final | must-have counts, auto journey route, same-name skills (all three personas) | Maya 75, Jon 58, Priya 58 (mean 64) | 12 of 12 | 25 |
| run 11 | repository age and archived status, install commands, everyday-tools role answer | Maya 67, Jon 67, Priya 58 (mean 64) | 12 of 12 | 23 |
| run 12 | beginner-aware search, combinable checks, per-tool evidence | Maya 67, Jon 67, Priya 58 (mean 64) | 12 of 12 | 21 |

Honest reading: the objective numbers improved a lot, page views per task fell by more than half, and Maya's scores rose to
75. Jon's and Priya's stayed between 50 and 67, with the lower scores coming from trust and guidance, not from not finding
things. Loop 10's two failures were bugs, now fixed: the skill install block sat below the fold, and the journey
start-station logic double-counted tools of the same kind. The final run, with all three personas on the final build,
succeeded at all 12 tasks. It also found two more bugs, fixed afterwards without a further run: the type and group
counts ignored a chosen category, and a listing said "No account needed" where the filter said "Runs offline".

Runs 11 and 12 did not raise the simulated scores: they stayed at a mean of 64 (5 and 5 for most participants, Priya at
4 and 5) while page views per run kept falling (25, 23, 21). The remaining complaints are about trust in data the store
does not own, so more interface work on this method was not moving the number. Real visitors, through `/rate`, are the
next measurement that can.

Still open, because they come from the roadmap's data or need real users: the ring and the offline check are checklist
answers, not tests; the ease scores come from a container-and-services checklist; dev tool pages have no install
command; community listings get no ring; a few figures, like npm's 10k stars (the `npm/cli` repository), read oddly.

## 3. Real UMUX-Lite from real visitors

`/rate` asks the two questions and opens a prefilled GitHub issue labelled `umux-lite`; nothing is stored on the site.
`bun scripts/umux.ts` reads those issues and prints the score, the two averages and a 95% interval. Aim for 80 or more
on 20 or more answers before drawing conclusions.
