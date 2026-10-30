// Portfolio: rate the tools you know from 0 to 3 and get your best-fit roles, your skill shape and a page to share.
// The ratings live in the address (?me=docker3,vite2), so a result is a link; nothing is stored. The scoring is the
// roadmap's own rule (assets/js/rolefit.js), so a portfolio here and the CV on pages.flisk.si agree.
import type { Entry } from "./catalog";
import { FAMILIES, ROLES, type Role, toolById } from "./views";

export type Level = 1 | 2 | 3;
export type Me = Record<string, Level>;

export const LEVEL_LABELS = [
	"Not rated",
	"Know of it",
	"Use it",
	"Know it well",
];

/** "docker3,vite2" -> { docker: 3, vite: 2 }. Unknown tools, bad levels and anything past 400 entries are dropped. */
export function parseMe(raw: string | undefined): Me {
	const me: Me = {};
	let n = 0;
	for (const part of (raw ?? "").slice(0, 8000).split(",")) {
		const m = /^([a-z0-9][a-z0-9-]{0,60}?)([1-3])$/.exec(part.trim());
		if (!m || !toolById(m[1]) || me[m[1]]) continue;
		me[m[1]] = Number(m[2]) as Level;
		if (++n >= 400) break;
	}
	return me;
}

export const meString = (me: Me) =>
	Object.keys(me)
		.sort()
		.map((id) => `${id}${me[id]}`)
		.join(",");

export interface Fit {
	role: Role;
	pct: number;
	/** How many of the role's must-have tools you rated, and how many it lists. */
	coreKnown: number;
	coreTotal: number;
	/** Must-have tools you have not rated. */
	gaps: string[];
	keyGot: number;
	/** None of the role's key tools is rated, so the match is halved. */
	noKey: boolean;
	keyGaps: string[];
}

const TIERS: [keyof Pick<Role, "core" | "daily" | "nice">, number][] = [
	["core", 3],
	["daily", 2],
	["nice", 1],
];

/**
 * A must-have tool counts 3, an every-day tool 2, a good-to-know tool 1, each times your level out of 3. Roles share
 * generic tools (Docker, Terraform), so each role names key tools; rate none of them and the match is halved.
 */
export function roleFit(me: Me, roles: Role[] = ROLES): Fit[] {
	return roles
		.map((role) => {
			let got = 0;
			let max = 0;
			const gaps: string[] = [];
			let coreKnown = 0;
			let coreTotal = 0;
			for (const [tier, weight] of TIERS)
				for (const id of role[tier] ?? []) {
					if (!toolById(id)) continue;
					max += weight * 3;
					got += weight * (me[id] ?? 0);
					if (tier === "core") {
						coreTotal++;
						if (me[id]) coreKnown++;
						else gaps.push(id);
					}
				}
			const keys = (role.key ?? []).filter((id) => toolById(id));
			const keyGot = keys.reduce((a, id) => a + (me[id] ?? 0), 0);
			const noKey = keys.length > 0 && keyGot === 0;
			const pct = max ? Math.round((got / max) * 100 * (noKey ? 0.5 : 1)) : 0;
			return {
				role,
				pct,
				coreKnown,
				coreTotal,
				gaps,
				keyGot,
				noKey,
				keyGaps: keys.filter((id) => !me[id]),
			};
		})
		.sort((a, b) => b.pct - a.pct || b.keyGot - a.keyGot);
}

/** Your total rating in each tool family, for the spider chart. */
export function familyShape(
	me: Me,
): { id: string; name: string; sum: number; known: number }[] {
	return FAMILIES.map((f) => {
		const ids = Object.keys(me).filter((id) => toolById(id)?.family === f.id);
		return {
			id: f.id,
			name: f.name,
			sum: ids.reduce((a, id) => a + (me[id] ?? 0), 0),
			known: ids.length,
		};
	});
}

/** The portfolio as Markdown, for a download or a README. */
export function portfolioMarkdown(me: Me, name: string, link: string): string {
	const fits = roleFit(me)
		.filter((f) => f.pct > 0)
		.slice(0, 3);
	const rated = Object.keys(me)
		.map((id) => toolById(id))
		.filter((t): t is Entry => Boolean(t))
		.sort(
			(a, b) =>
				(me[b.id] ?? 0) - (me[a.id] ?? 0) || a.name.localeCompare(b.name),
		);
	const lines = [`# ${name ? `${name}'s ` : "My "}developer portfolio`, ""];
	if (fits.length)
		lines.push(
			`Best fit: ${fits.map((f) => `**${f.role.name}** (${f.pct}%)`).join(", ")}`,
			"",
		);
	lines.push("## Tools", "");
	for (const l of [3, 2, 1]) {
		const at = rated.filter((t) => me[t.id] === l);
		if (at.length)
			lines.push(
				`**${LEVEL_LABELS[l]}:** ${at.map((t) => t.name).join(", ")}`,
				"",
			);
	}
	lines.push(`Made with Flisk Tools: ${link}`, "");
	return lines.join("\n");
}

/** A display name from the address: printable characters only, no markup characters, 40 at most. */
export const cleanName = (s: string | undefined) =>
	[...(s ?? "")]
		.filter((ch) => ch >= " " && ch !== "\u007f" && !'<>"`'.includes(ch))
		.join("")
		.trim()
		.slice(0, 40);
