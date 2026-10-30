// UMUX-Lite: two statements rated 1 (strongly disagree) to 7 (strongly agree), a standard short usability measure:
//   "This site's capabilities meet my requirements."  and  "This site is easy to use."
// Score 0 to 100 = (capabilities + easy - 2) / 12 * 100. The regression-adjusted score maps it onto the SUS scale.
// Answers are stored as GitHub issues labelled `umux-lite` (the visitor presses Submit on GitHub), so there is no database.

export const UMUX_LABEL = "umux-lite";

export interface Answer {
	capabilities: number;
	easy: number;
}

const rating = (v: string | undefined) => {
	const n = Number(v);
	return Number.isInteger(n) && n >= 1 && n <= 7 ? n : undefined;
};

/** Reads ?c=&e= from a form, or undefined when either is missing or outside 1 to 7. */
export function readAnswer(
	c: string | undefined,
	e: string | undefined,
): Answer | undefined {
	const capabilities = rating(c);
	const easy = rating(e);
	return capabilities && easy ? { capabilities, easy } : undefined;
}

/** 0 to 100. */
export const umuxScore = (a: Answer) =>
	((a.capabilities + a.easy - 2) / 12) * 100;

/** The regression-adjusted score, comparable with SUS. */
export const umuxAdjusted = (a: Answer) => 0.65 * umuxScore(a) + 22.9;

/** The mean score of several answers, or undefined for none. */
export function umuxMean(list: Answer[]): number | undefined {
	return list.length
		? list.reduce((s, a) => s + umuxScore(a), 0) / list.length
		: undefined;
}

/** The GitHub new-issue address that carries an answer, so the visitor only presses Submit. */
export function issueUrl(
	repo: string,
	a: Answer,
	comment: string,
	from: string,
): string {
	const body = [
		`capabilities: ${a.capabilities}`,
		`easy: ${a.easy}`,
		`score: ${umuxScore(a).toFixed(1)}`,
		`from: ${from}`,
		"",
		comment.trim().slice(0, 600),
	].join("\n");
	const p = new URLSearchParams({
		title: `UMUX-Lite ${umuxScore(a).toFixed(0)} (capabilities ${a.capabilities}, easy ${a.easy})`,
		labels: UMUX_LABEL,
		body,
	});
	return `${repo}/issues/new?${p.toString()}`;
}

/** Pulls an answer back out of an issue body written by issueUrl. */
export function parseIssue(body: string): Answer | undefined {
	const c = /^capabilities:\s*(\d)\s*$/m.exec(body)?.[1];
	const e = /^easy:\s*(\d)\s*$/m.exec(body)?.[1];
	return readAnswer(c, e);
}
