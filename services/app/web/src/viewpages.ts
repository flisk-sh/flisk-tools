// The roadmap-style views: Compass, Radar, Journeys, Roles, Skills and Ask. All drawn on the server (SVG and HTML, no
// script); every dot and chip is a link to the listing.
import {
	counts,
	ENTRIES,
	type Entry,
	PAGE_SIZE,
	search,
	symbol,
} from "./catalog";
import { PUBLISH_API } from "./client";
import { card, color, layout, rootOf } from "./pages";
import {
	cleanName,
	familyShape,
	LEVEL_LABELS,
	meString,
	parseMe,
	roleFit,
} from "./portfolio";
import { esc } from "./seo";
import { SITE } from "./site";
import {
	ageOf,
	compass,
	DX,
	daysSince,
	FAMILIES,
	LEVELS,
	PARITY,
	RINGS,
	ROADMAP_TOOLS,
	ROLE_GROUPS,
	ROLES,
	type Role,
	resolveNames,
	SKILL_CATEGORIES,
	TRACKS,
	toolById,
	typedTools,
	unit,
} from "./views";

const sub = (href: string, label: string, n: number | undefined, on: boolean) =>
	`<a class="subtab" href="${esc(href)}"${on ? ' aria-current="page"' : ""}>${esc(label)}${n === undefined ? "" : `<small>${n}</small>`}</a>`;

const familyTabs = (root: string, path: string, current?: string) =>
	`<nav class="subtabs" aria-label="Family">${sub(`${root}/${path}`, "All", ROADMAP_TOOLS.length, !current)}${FAMILIES.map((f) => sub(`${root}/${path}?family=${f.id}`, f.name, ROADMAP_TOOLS.filter((t) => t.family === f.id).length, current === f.id)).join("")}</nav>`;

const hero = (eyebrow: string, title: string, lede: string) =>
	`<section class="hero"><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="lede">${esc(lede)}</p></section>`;

const familyColor = (id: string | undefined) =>
	FAMILIES.find((f) => f.id === id)?.color ?? "#22c55e";

const dot = (root: string, t: Entry, cx: number, cy: number, r: number) =>
	`<a href="${root}/listing/${t.id}" class="dot"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${familyColor(t.family)}"><title>${esc(`${t.name}: ${t.tagline}`)}</title></circle></a>`;

/** The Compass: easy to use (left to right) against made for big, real systems (bottom to top). */
export function compassPage(base: string, family?: string): string {
	const root = rootOf(base);
	const fam = FAMILIES.find((f) => f.id === family)?.id;
	const tools = ROADMAP_TOOLS.filter((t) => !fam || t.family === fam);
	const W = 760;
	const H = 640;
	const m = { l: 60, r: 20, t: 20, b: 60 };
	const px = (v: number) => m.l + (v / 100) * (W - m.l - m.r);
	const py = (v: number) => H - m.b - (v / 100) * (H - m.t - m.b);
	const grid = [0, 20, 40, 60, 80, 100]
		.map(
			(v) =>
				`<line x1="${px(v)}" y1="${py(0)}" x2="${px(v)}" y2="${py(100)}" class="gl"/><line x1="${px(0)}" y1="${py(v)}" x2="${px(100)}" y2="${py(v)}" class="gl"/><text x="${px(v)}" y="${H - m.b + 18}" class="at" text-anchor="middle">${v}</text><text x="${m.l - 10}" y="${py(v) + 4}" class="at" text-anchor="end">${v}</text>`,
		)
		.join("");
	const dots = tools
		.map((t) => {
			const c = compass(t);
			// Ten points per check puts many tools on the same spot, so each gets a small stable offset inside its cell.
			const jx = (unit(t.id, "x") - 0.5) * 7;
			const jy = (unit(t.id, "y") - 0.5) * 7;
			return dot(
				root,
				t,
				px(Math.min(100, Math.max(0, c.x + jx))),
				py(Math.min(100, Math.max(0, c.y + jy))),
				5,
			);
		})
		.join("");
	return layout(
		base,
		{
			path: "compass",
			title: "Compass: easy to use against built for big systems",
			description:
				`${tools.length} developer tools placed by a checklist: easy to use left to right, made for big real systems bottom to top. Click a dot to open it.`.slice(
					0,
					160,
				),
			noindex: Boolean(fam),
			crumbs: [{ name: "Compass", path: "compass" }],
		},
		`${hero("Compass", "Easy to use, or <em>built for big systems</em>?", "No dot is placed by hand: a tool's position is 10 points for each check it meets. Hover a dot for the one-liner, click to open it.")}
${familyTabs(root, "compass", fam)}
<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Compass of ${tools.length} tools">${grid}
<text x="${(px(0) + px(100)) / 2}" y="${H - 14}" class="al" text-anchor="middle">${esc(DX.low)} ← ${esc(DX.short)} → ${esc(DX.high)}</text>
<text transform="translate(16 ${(py(0) + py(100)) / 2}) rotate(-90)" class="al" text-anchor="middle">${esc(PARITY.low)} ← ${esc(PARITY.short)} → ${esc(PARITY.high)}</text>
<text x="${px(3)}" y="${py(97)}" class="q">Hard but big</text><text x="${px(97)}" y="${py(97)}" class="q" text-anchor="end">Easy and big</text><text x="${px(3)}" y="${py(4)}" class="q">Hard and small</text><text x="${px(97)}" y="${py(4)}" class="q" text-anchor="end">Easy and small</text>
${dots}</svg></figure>
<ul class="legend2">${FAMILIES.map((f) => `<li><span class="sw" style="background:${f.color}"></span>${esc(f.name)}</li>`).join("")}</ul>
<p class="note">${esc(DX.explain)}</p>
${quadrants(root, tools)}`,
		"compass",
	);
}

/** The Compass in words: the most-starred tools in each corner, for anyone who cannot read a chart. */
function quadrants(root: string, tools: Entry[]): string {
	const cell = (
		label: string,
		test: (c: { x: number; y: number }) => boolean,
	) => {
		const list = tools
			.filter((t) => test(compass(t)))
			.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
			.slice(0, 8);
		return `<section class="ringbox"><h3>${esc(label)} <small>${tools.filter((t) => test(compass(t))).length}</small></h3><p class="chiplist">${list.map((t) => `<a class="chip2" href="${root}/listing/${t.id}" style="--c:${familyColor(t.family)}">${esc(t.name)}</a>`).join("")}</p></section>`;
	};
	return `<h2>In words</h2><div class="rings">${cell("Easy to use and built for big systems", (c) => c.x >= 50 && c.y >= 50)}${cell("Easy to use, small and simple", (c) => c.x >= 50 && c.y < 50)}${cell("Harder to use, built for big systems", (c) => c.x < 50 && c.y >= 50)}${cell("Harder to use, small and simple", (c) => c.x < 50 && c.y < 50)}</div><p class="note">The eight most-starred in each corner. Use the family tabs above to narrow it.</p>`;
}

/** The Adoption Radar: Adopt, Trial, Assess or Hold, one slice per family. */
export function radarPage(base: string, family?: string): string {
	const root = rootOf(base);
	const fam = FAMILIES.find((f) => f.id === family)?.id;
	const S = 760;
	const c = S / 2;
	const radii = [118, 200, 282, 356];
	const inner = [14, ...radii.slice(0, 3)];
	const n = FAMILIES.length;
	const slice = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
	const rings = RINGS.map(
		(ring, i) =>
			`<circle cx="${c}" cy="${c}" r="${radii[i]}" class="rg r-${ring.id}"/><text x="${c + 6}" y="${c - inner[i] - (radii[i] - inner[i]) / 2 + 4}" class="rl r-${ring.id}">${esc(ring.label)}</text>`,
	).reverse();
	const spokes = FAMILIES.map(
		(_, i) =>
			`<line x1="${c}" y1="${c}" x2="${(c + Math.cos(slice(i)) * radii[3]).toFixed(1)}" y2="${(c + Math.sin(slice(i)) * radii[3]).toFixed(1)}" class="gl"/>`,
	).join("");
	const names = FAMILIES.map((f, i) => {
		const a = slice(i) + Math.PI / n;
		return `<text x="${(c + Math.cos(a) * (radii[3] + 2)).toFixed(1)}" y="${(c + Math.sin(a) * (radii[3] + 2)).toFixed(1)}" class="fl" text-anchor="middle" fill="${f.color}">${esc(f.name)}</text>`;
	}).join("");
	const tools = ROADMAP_TOOLS.filter((t) => !fam || t.family === fam);
	const dots = tools
		.map((t) => {
			const fi = FAMILIES.findIndex((f) => f.id === t.family);
			const ri = RINGS.findIndex((r) => r.id === t.ring);
			if (fi < 0 || ri < 0) return "";
			const a =
				slice(fi) + (0.08 + 0.84 * unit(t.id, "a")) * ((Math.PI * 2) / n);
			const r = inner[ri] + 10 + unit(t.id, "r") * (radii[ri] - inner[ri] - 20);
			return dot(root, t, c + Math.cos(a) * r, c + Math.sin(a) * r, 4.6);
		})
		.join("");
	const byRing = RINGS.map((ring) => ({
		ring,
		list: tools.filter((t) => t.ring === ring.id),
	}));
	return layout(
		base,
		{
			path: "radar",
			title: "Adoption Radar: adopt, trial, assess or hold",
			description:
				`${tools.length} developer tools sorted into Adopt, Trial, Assess and Hold from release and maturity signals, one slice per family. Click a dot to open it.`.slice(
					0,
					160,
				),
			noindex: Boolean(fam),
			crumbs: [{ name: "Radar", path: "radar" }],
		},
		`${hero("Adoption Radar", "Adopt, trial, assess or <em>hold</em>", "Each tool's ring follows rules about its release age, version and last update, with an evidence link on the roadmap. Hover a dot, click to open.")}
${familyTabs(root, "radar", fam)}
<figure class="chart"><svg viewBox="-90 -20 ${S + 180} ${S + 40}" role="img" aria-label="Adoption radar of ${tools.length} tools">${rings.join("")}${spokes}${names}${dots}</svg></figure>
<div class="rings">${byRing.map(({ ring, list }) => `<section class="ringbox r-${ring.id}"><h3>${esc(ring.label)} <small>${list.length}</small></h3><p class="note">${esc(ring.help)}</p><p class="chiplist">${list.map((t) => `<a class="chip2" href="${root}/listing/${t.id}" style="--c:${familyColor(t.family)}">${esc(t.name)}</a>`).join("")}</p></section>`).join("")}</div>`,
		"radar",
	);
}

const ROUTE_NAMES: Record<string, string> = {
	backend: "Backend engineer route",
	"ai-agents": "AI and agents engineer route",
	platform: "Platform engineer route",
};

/** Journeys: seven levels from Package Wrangler to Platform Architect, as a metro line, with a route for each track. */
export function journeysPage(
	base: string,
	trackId?: string,
	know?: string,
): string {
	const root = rootOf(base);
	const typed0 = typedTools(know);
	const ids0 = new Set(typed0.flatMap((x) => (x.hit ? [x.hit.id] : [])));
	// With no route chosen, open the one where you already know the most main tools; otherwise the first.
	const fits0 = TRACKS.map((t) => ({
		t,
		n: Object.values(t.stops).reduce(
			(a, s) => a + s.main.filter((id) => ids0.has(id)).length,
			0,
		),
	}));
	const track =
		TRACKS.find((t) => t.id === trackId) ??
		(ids0.size ? fits0.sort((a, b) => b.n - a.n)[0].t : TRACKS[0]);
	const typed = typedTools(know);
	const knownIds = new Set(typed.flatMap((x) => (x.hit ? [x.hit.id] : [])));
	// Only an exact match counts as known. A tool of the same kind (npm for pnpm) is shown as a hint, once per tool you typed.
	const matched = (ids: string[]) =>
		ids.filter((id) => knownIds.has(id)).map((id) => toolById(id)?.name ?? id);
	const knownOf = (ids: string[]) => matched(ids).length;
	const similar = (ids: string[]) => {
		const used = new Set<string>();
		const out: string[] = [];
		for (const id of ids) {
			const t = toolById(id);
			if (!t || knownIds.has(id)) continue;
			const like = typed.find(
				(x) =>
					x.hit &&
					!used.has(x.hit.id) &&
					x.hit.id !== id &&
					x.hit.category === t.category,
			)?.hit;
			if (like) {
				used.add(like.id);
				out.push(`${like.name} is the same kind as ${t.name}`);
			}
		}
		return out;
	};
	const partial = knownIds.size
		? LEVELS.filter((l) => {
				const main = track.stops[l.id]?.main ?? [];
				const k = knownOf(main);
				return k > 0 && k < Math.ceil(main.length / 2);
			}).map((l) => l.n)
		: [];
	const skim = knownIds.size
		? LEVELS.filter((l) => {
				const main = track.stops[l.id]?.main ?? [];
				return main.length > 0 && knownOf(main) >= Math.ceil(main.length / 2);
			}).map((l) => l.n)
		: [];
	const startAt = knownIds.size
		? LEVELS.find((l) => {
				const main = track.stops[l.id]?.main ?? [];
				return main.length > 0 && knownOf(main) < Math.ceil(main.length / 2);
			})
		: undefined;
	const knowForm = `<form class="search" role="search" action="${root}/journeys" method="get"><input type="hidden" name="track" value="${esc(track.id)}"><input type="search" name="know" value="${esc(know ?? "")}" placeholder="Tools you know: npm, vite, docker" aria-label="Tools you know"><button type="submit">Where do I start?</button></form>${knownIds.size ? `<p class="verdict-line">${startAt ? `Start at station ${startAt.n}: <b>${esc(startAt.name)}</b>.${partial.length ? ` You already know some tools at station ${partial.join(", ")}, so skim those.` : ""}${skim.length ? ` You can skim ${skim.length === 1 ? "station" : "stations"} ${skim.join(", ")}, where you already know most of the main tools.` : ""}` : "You already know most of the main tools on this route. Look at the last stations for what is next."}</p>` : typed.length ? `<p class="note">No tools recognised in “${esc(know ?? "")}”.</p>` : ""}`;
	const chip = (id: string, main: boolean) => {
		const t = toolById(id);
		return t
			? `<a class="chip2${main ? " main" : ""}" href="${root}/listing/${t.id}" style="--c:${familyColor(t.family)}">${esc(t.name)}</a>`
			: "";
	};
	return layout(
		base,
		{
			path: "journeys",
			title: "Journeys: seven levels, three routes",
			description:
				`Seven levels from Package Wrangler to Platform Architect, with the tools to learn at each stop for the ${track.name} route.`.slice(
					0,
					160,
				),
			noindex: track.id !== TRACKS[0].id,
			crumbs: [{ name: "Journeys", path: "journeys" }],
		},
		`${hero("Journeys", "Seven levels, <em>one line</em>", "A metro line from your first lockfile to platform architecture. Pick a route; each station lists the tools to learn and the ones worth knowing.")}
<nav class="start" aria-label="Route">${TRACKS.map((t) => `<a href="${root}/journeys?track=${t.id}${know ? `&amp;know=${encodeURIComponent(know)}` : ""}"${t.id === track.id ? ' aria-current="page" class="on"' : ""}><b>${esc(ROUTE_NAMES[t.id] ?? `${t.name} route`)}</b><small>${esc(t.blurb)}</small></a>`).join("")}</nav>
${knowForm}
<p class="note">Showing the ${esc(track.name)} route. Each station lists tools to learn first (bold) and tools worth knowing.</p>
<ol class="metro">${LEVELS.map((l) => {
			const stop = track.stops[l.id];
			return `<li id="${l.id}"><span class="station" aria-hidden="true">${l.n}</span><div class="stop"><h3>${esc(l.name)}</h3><p>${esc(l.goal)}</p>${stop?.tip ? `<p class="tip">${esc(stop.tip)}</p>` : ""}${knownIds.size && stop?.main?.length ? `<p class="note">You know ${knownOf(stop.main)} of ${stop.main.length} tools to learn first here${knownOf(stop.main) ? `: ${matched(stop.main).map(esc).join(", ")}` : ""}.${similar(stop.main).length ? ` ${similar(stop.main).map(esc).join("; ")}.` : ""}</p>` : ""}<p class="chiplist"><span class="flabel">Learn first</span>${(stop?.main ?? []).map((id) => chip(id, true)).join("")}</p><p class="chiplist"><span class="flabel">Also worth knowing</span>${(stop?.side ?? []).map((id) => chip(id, false)).join("")}</p><p class="note">You learn: ${l.skills.map(esc).join(" · ")}</p>${l.flisk && l.flisk.status !== "soon" ? `<p class="note">Flisk: ${esc(l.flisk.text)}</p>` : ""}</div></li>`;
		}).join("")}</ol>
<details class="legend-rings"><summary>Where Flisk helps on this line, and where not yet</summary><ul class="verdict">${LEVELS.filter(
			(l) => l.flisk,
		)
			.map((l) => `<li><b>${esc(l.name)}:</b> ${esc(l.flisk?.text ?? "")}</li>`)
			.join("")}</ul></details>`,
		"journeys",
	);
}

/** Roles: jobs in software and the tools each one needs. */
export function rolesPage(base: string, group?: string, know?: string): string {
	const root = rootOf(base);
	const g = ROLE_GROUPS.find((x) => x.id === group) ?? ROLE_GROUPS[0];
	const list = ROLES.filter((r) => r.group === g.id);
	// "Which role fits me?": tools typed by name become ratings of 2 ("use it"), no script needed.
	const typed = (know ?? "")
		.slice(0, 300)
		.split(know?.includes(",") ? /[,;\n]/ : /\s+/)
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 15);
	const found = typed.map((n) => ({ n, hit: resolveNames(n, 1)[0] }));
	const knownTools = found.flatMap((x) =>
		x.hit?.kind === "skill" ? [] : x.hit ? [x.hit] : [],
	);
	const meKnow = parseMe(knownTools.map((t) => `${t.id}3`).join(","));
	const bestFits = Object.keys(meKnow).length
		? roleFit(meKnow)
				.filter((f) => f.pct > 0)
				.slice(0, 5)
		: [];
	const finder = `<form class="search" role="search" action="${root}/roles" method="get"><input type="search" name="know" value="${esc(know ?? "")}" placeholder="Tools you know: npm, vite, docker" aria-label="Tools you know"><button type="submit">Find my role</button></form>${
		typed.length
			? `<div class="result"><p class="note">Understood: ${
					found
						.filter((x) => x.hit)
						.map((x) =>
							x.hit && x.hit.name.toLowerCase() !== x.n.toLowerCase()
								? `${esc(x.n)} (read as ${esc(x.hit.name)})`
								: esc(x.hit?.name ?? ""),
						)
						.join(", ") || "nothing"
				}${
					found.some((x) => !x.hit)
						? `. Not found: ${found
								.filter((x) => !x.hit)
								.map((x) => esc(x.n))
								.join(", ")}`
						: ""
				}.</p>${
					bestFits.length
						? `<p class="verdict-line">Your best fit: <b>${esc(bestFits[0].role.name)}</b> (you know ${bestFits[0].useKnown} of the ${bestFits[0].useTotal} tools it uses every day). ${because(bestFits[0].role, meKnow)} Open it below, or start with its Learn next list.</p><ol class="fits">${bestFits
								.map(
									(f) =>
										`<li><div class="fit-top"><strong><a href="${root}/roles?group=${f.role.group}#${f.role.id}">${esc(f.role.name)}</a></strong><span>${f.useKnown} of ${f.useTotal} tools it uses every day <small class="note">(${f.coreKnown} of ${f.coreTotal} must-have)</small></span></div><div class="bar"><i style="width:${Math.round((f.pct / Math.max(1, bestFits[0].pct)) * 100)}%"></i></div>${
											f.gaps.length
												? `<p class="note">Learn next: ${f.gaps
														.slice(0, 4)
														.map(
															(id) =>
																`<a href="${root}/listing/${id}">${esc(toolById(id)?.name ?? id)}</a>`,
														)
														.join(", ")}</p>`
												: ""
										}</li>`,
								)
								.join(
									"",
								)}</ol><p class="note">The bars compare roles with each other: the longest is your closest match, whatever its size. Every job lists many tools, so knowing a few of them is a normal start; add more tools you know to sharpen the answer. For a finer answer, <a href="${root}/portfolio?me=${encodeURIComponent(meString(meKnow))}">rate how well you know each one</a>.</p>`
						: "<p>No role matched those tools yet. Try more tools, like <code>npm, vite, docker</code>.</p>"
				}</div>`
			: ""
	}`;
	const tools = (ids: string[]) =>
		ids
			.map((id) => toolById(id))
			.filter((t): t is Entry => Boolean(t))
			.map(
				(t) =>
					`<a class="chip2" href="${root}/listing/${t.id}" style="--c:${familyColor(t.family)}">${esc(t.name)}</a>`,
			)
			.join("");
	return layout(
		base,
		{
			path: "roles",
			title: "Roles: the tools each developer job needs",
			description:
				`${ROLES.length} jobs in software, from Backend Engineer to Platform Architect, and the tools each one needs: must have, every day, good to know.`.slice(
					0,
					160,
				),
			noindex: g.id !== ROLE_GROUPS[0].id,
			crumbs: [{ name: "Roles", path: "roles" }],
		},
		`${hero("Roles", "What does <em>your job</em> need?", `${ROLES.length} jobs in software and the tools each one needs: must have, every day, good to know.`)}
${finder}
<nav class="subtabs" aria-label="Group">${ROLE_GROUPS.map((x) => sub(`${root}/roles?group=${x.id}`, x.name, ROLES.filter((r) => r.group === x.id).length, x.id === g.id)).join("")}</nav>
<p class="note">${esc(g.blurb)} Not sure which job fits? <a href="${root}/portfolio">Rate the tools you know</a> and get your best match.</p>
${bestFits.length ? `<details class="legend-rings"><summary>Browse all ${ROLES.length} roles</summary>` : ""}<ul class="grid">${list.map((r) => `<li class="card" id="${r.id}" style="${color(r.group)}"><div class="top"><span class="sym" aria-hidden="true">${esc(symbol(r))}</span><h3>${esc(r.name)}</h3></div><p>${esc(r.what)}</p><details><summary>Tools for this job</summary><p class="note">Must have</p><p class="chiplist">${tools(r.core)}</p><p class="note">Every day</p><p class="chiplist">${tools(r.daily)}</p><p class="note">Good to know</p><p class="chiplist">${tools(r.nice)}</p><p class="note">A day: ${r.day.map(esc).join(" · ")}</p></details></li>`).join("")}</ul>${bestFits.length ? "</details>" : ""}`,
		"roles",
	);
}

/** Skills: the agent skills, by what they help with. */
export function skillsPage(base: string, cat?: string, page = 1): string {
	const root = rootOf(base);
	const current = SKILL_CATEGORIES.find((c) => c.id === cat);
	const r = search({ kind: "skill", category: current?.name, page });
	const skillCount = counts("skill");
	const link = (extra: { cat?: string; page?: number }) =>
		esc(
			`${root}/skills${extra.cat ? `?cat=${extra.cat}` : ""}${extra.page && extra.page > 1 ? `${extra.cat ? "&" : "?"}page=${extra.page}` : ""}`,
		);
	return layout(
		base,
		{
			path: "skills",
			title: "Skills: free AI agent skills from GitHub",
			description:
				`${skillCount} free AI agent skills from GitHub, by what they help with: plan, code, test, debug, review, ship. Sorted by stars.`.slice(
					0,
					160,
				),
			noindex: Boolean(current) || r.page > 1,
			crumbs: [{ name: "Skills", path: "skills" }],
		},
		`${hero("Skills", `${skillCount} agent skills, <em>${current ? esc(current.name) : "by what they do"}</em>`, current?.blurb ?? "Free skills for AI coding agents, from public GitHub repositories, sorted by stars.")}
<nav class="subtabs" aria-label="Category">${sub(`${root}/skills`, "All", skillCount, !current)}${SKILL_CATEGORIES.map((c) => sub(`${root}/skills?cat=${c.id}`, c.name, ENTRIES.filter((e) => e.kind === "skill" && e.category === c.name).length, current?.id === c.id)).join("")}</nav>
<p class="count">${r.total} skills</p>
<ul class="grid">${r.items.map((e) => card(root, e)).join("")}</ul>
<p class="pager"><span>${r.page > 1 ? `<a rel="prev" href="${link({ cat: current?.id, page: r.page - 1 })}">← Previous</a>` : ""}</span><span>Page ${r.page} of ${r.pages} · ${PAGE_SIZE} per page</span><span>${r.page < r.pages ? `<a rel="next" href="${link({ cat: current?.id, page: r.page + 1 })}">Next →</a>` : ""}</span></p>`,
		"skills",
	);
}

/** Which of the tools you typed are in the role's lists, so the match is explained. */
function because(role: Role, me: Record<string, number>): string {
	const all = [...role.core, ...role.daily, ...role.nice];
	const known = all.filter((id) => me[id]);
	return known.length
		? `It matches because you know ${known.map((id) => esc(toolById(id)?.name ?? id)).join(", ")}, which are on its list.`
		: "";
}

/** One line of independent evidence for a tool: its ring, how long the repository has existed, how recently it shipped. */
function evidenceLine(t: Entry): string {
	const parts: string[] = [];
	if (t.ring)
		parts.push(
			`${t.ring === "adopt" ? "Adopt" : t.ring === "trial" ? "Trial" : t.ring === "assess" ? "Assess" : "Hold"} ring`,
		);
	if (t.created) parts.push(`repository ${ageOf(t.created)} old`);
	const d = daysSince(t.release);
	if (d !== undefined) parts.push(`last release ${d} days ago`);
	if (t.archived) parts.push("archived, no longer maintained");
	return esc(parts.join(", ") || "no evidence recorded");
}

/** A plain-words verdict above the compare table: who leads on each thing that can be measured. */
function verdict(picks: Entry[]): string {
	if (picks.length < 2) return "";
	const lead = (
		label: string,
		score: (t: Entry) => number,
		show: (t: Entry) => string,
	) => {
		const ranked = [...picks].sort((a, b) => score(b) - score(a));
		if (score(ranked[0]) <= 0 || score(ranked[0]) === score(ranked[1]))
			return "";
		return `<li><b>${esc(label)}:</b> ${esc(ranked[0].name)} <span class="note">${esc(show(ranked[0]))}</span></li>`;
	};
	const date = (s?: string) => (s ? Date.parse(s) || 0 : 0);
	const items = [
		lead(
			"Most recent release",
			(t) => date(t.release),
			(t) => t.release ?? "",
		),
		lead(
			"Most starred",
			(t) => t.stars ?? 0,
			(t) => `${(t.stars ?? 0).toLocaleString("en-US")} stars`,
		),
		lead(
			"Easiest to use",
			(t) => t.dx?.length ?? 0,
			(t) => `${(t.dx?.length ?? 0) * 10}/100`,
		),
		picks.some((t) => (t.parity?.length ?? 0) >= 4)
			? lead(
					"Most ready for big systems",
					(t) => t.parity?.length ?? 0,
					(t) => `${(t.parity?.length ?? 0) * 10}/100`,
				)
			: "",
	].filter(Boolean);
	const same = picks.every((t) => t.ring && t.ring === picks[0].ring);
	return `<div class="result"><h3>At a glance</h3><ul class="verdict">${items.join("")}</ul><h4 class="evh">The evidence for each</h4><ul class="verdict">${picks.map((t) => `<li><b>${esc(t.name)}</b>: ${evidenceLine(t)}</li>`).join("")}</ul><p class="note">${same ? `All are ${esc(picks[0].ring ?? "")}: the rings do not separate them, so use the lines above.` : "Maturity ring, from the Adoption Radar rules."} There is no single winner: pick on what matters to you.</p></div>`;
}

/** What Adopt, Trial, Assess and Hold mean, shown under a comparison so a ring is never a bare word. */
function ringLegend(picks: Entry[]): string {
	if (!picks.some((t) => t.ring)) return "";
	return `<details class="legend-rings"><summary>What the rings mean</summary><ul class="verdict">${RINGS.map((r) => `<li><span class="rk r-${r.id}">${esc(r.label)}</span> ${esc(r.help)}</li>`).join("")}</ul></details>`;
}

/** Ask: "yarn vs npm vs bun" answered as a side-by-side table from the data, no AI call. */
export function askPage(base: string, q = ""): string {
	const root = rootOf(base);
	const picks = resolveNames(q);
	const examples = [
		"yarn vs npm vs bun",
		"docker compose vs tilt vs skaffold",
		"langgraph vs crewai",
		"flisk vs tilt",
	];
	const row = (label: string, cell: (t: Entry) => string) =>
		`<tr><th scope="row">${esc(label)}</th>${picks.map((t) => `<td>${cell(t)}</td>`).join("")}</tr>`;
	// The "big, real systems" checks are about containers and services: leave them out when none of these tools has many.
	const showBig = picks.some((t) => (t.parity?.length ?? 0) >= 4);
	const ringLabel = (t: Entry) =>
		RINGS.find((r) => r.id === t.ring)?.label ?? "-";
	const check = (list: string[] | undefined, id: string) =>
		list?.includes(id)
			? '<span class="pass">✓</span>'
			: '<span class="no">·</span>';
	const table = picks.length
		? `<div class="tablewrap"><table class="compare"><thead><tr><th></th>${picks.map((t) => `<th scope="col"><a href="${root}/listing/${t.id}">${esc(t.name)}</a></th>`).join("")}</tr></thead><tbody>
${row("What it is", (t) => esc(t.tagline))}${row("Adoption ring", (t) => (t.ring ? `<span class="rk r-${t.ring}">${esc(ringLabel(t))}</span>` : "-"))}${row("Easy to use", (t) => (t.dx ? `${t.dx.length * 10} / 100` : "-"))}${showBig ? row("Big, real systems", (t) => (t.parity ? `${t.parity.length * 10} / 100` : "-")) : ""}${row("GitHub stars", (t) => (t.stars ? t.stars.toLocaleString("en-US") : "-"))}${row("Repository age", (t) => (t.created ? `${esc(ageOf(t.created))} (since ${esc(t.created.slice(0, 4))})` : "-"))}${row("Status", (t) => (t.archived ? '<span class="rk r-hold">Archived</span>' : "Active"))}${row("Latest release", (t) => (t.version ? `${esc(t.version.replace(/^.*\//, ""))}${t.release ? `, ${esc(t.release)} (${daysSince(t.release) ?? "?"} days ago)` : ""}` : "-"))}${row("Last push", (t) => esc(t.pushed ?? "-"))}${row("License", (t) => esc(t.license ?? "-"))}${row("MCP server", (t) => (t.mcp ? "Yes" : "-"))}
<tr class="sec"><th scope="row" colspan="${picks.length + 1}">${esc(DX.title)}</th></tr>${DX.criteria.map((c) => row(c.label, (t) => check(t.dx, c.id))).join("")}
${showBig ? `<tr class="sec"><th scope="row" colspan="${picks.length + 1}">${esc(PARITY.title)}</th></tr>${PARITY.criteria.map((c) => row(c.label, (t) => check(t.parity, c.id))).join("")}` : ""}
</tbody></table></div>`
		: q
			? `<p>No tool matched “${esc(q)}”. Try names like <code>yarn vs npm</code>.</p>`
			: "";
	return layout(
		base,
		{
			path: "ask",
			title: "Ask: compare tools side by side",
			description:
				`Type yarn vs npm vs bun and get a side-by-side answer from the ${SITE.name} data: adoption ring, ease of use, big-system fit, stars and license. No AI call.`.slice(
					0,
					160,
				),
			noindex: Boolean(q),
			crumbs: [{ name: "Ask", path: "ask" }],
		},
		`${hero("Compare", "Compare tools, <em>side by side</em>", "Type two to five tools with vs, a comma or and. The answer comes from the data, every check with its meaning, and no AI is called.")}
<form class="search" role="search" action="${root}/ask" method="get"><input type="search" name="q" value="${esc(q)}" placeholder="yarn vs npm vs bun" aria-label="Tools to compare"><button type="submit">Compare</button></form>
<p class="chiplist" style="margin-top:.8rem">${examples.map((x) => `<a class="chip2" href="${root}/ask?q=${encodeURIComponent(x)}">${esc(x)}</a>`).join("")}</p>
${verdict(picks)}${table}${ringLegend(picks)}${picks.length && !showBig ? `<p class="note">The big, real systems checks are left out: they are about containers and services and do not apply to these tools.</p>` : ""}${picks.length ? `<p class="note">Easy to use and Big, real systems count the checks each tool meets, 10 points each; the ticks below show which. Maturity comes from the Adoption Radar rules: release age, version and last update. The two scores come from a checklist written for local development with containers and services, so for tools outside that world, like package managers, read them lightly.</p>` : ""}`,
		"ask",
	);
}

/** A spider chart of the families: the shape is the point, so it is scaled to your strongest one. */
function spider(shape: ReturnType<typeof familyShape>): string {
	const size = 380;
	const c = size / 2;
	const R = c - 58;
	const n = shape.length;
	const max = Math.max(3, ...shape.map((s) => s.sum));
	const pt = (i: number, v: number) => {
		const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
		return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const;
	};
	const ring = (k: number) =>
		`<polygon class="spider-ring" points="${shape
			.map((_, i) =>
				pt(i, k)
					.map((v) => v.toFixed(1))
					.join(","),
			)
			.join(" ")}"/>`;
	const poly = shape
		.map((s, i) =>
			pt(i, s.sum / max)
				.map((v) => v.toFixed(1))
				.join(","),
		)
		.join(" ");
	const labels = shape
		.map((s, i) => {
			const [x, y] = pt(i, 1.2);
			return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="sl" text-anchor="middle">${esc(s.name)}</text>`;
		})
		.join("");
	return `<svg viewBox="0 0 ${size} ${size}" class="spider" role="img" aria-label="Your skill shape across tool families">${[0.25, 0.5, 0.75, 1].map(ring).join("")}<polygon class="spider-shape" points="${poly}"/>${labels}</svg>`;
}

export function portfolioPage(
	base: string,
	opts: { me?: string; name?: string; family?: string } = {},
): string {
	const root = rootOf(base);
	const me = parseMe(opts.me);
	const name = cleanName(opts.name);
	const rated = Object.keys(me).length;
	const fam = FAMILIES.find((f) => f.id === opts.family)?.id ?? FAMILIES[0].id;
	const fits = roleFit(me);
	const best = fits.filter((f) => f.pct > 0).slice(0, 6);
	const shape = familyShape(me);
	const q = (extra: string) => {
		const p = new URLSearchParams(extra);
		if (rated) p.set("me", meString(me));
		if (name) p.set("name", name);
		const s = p.toString();
		return `${root}/portfolio${s ? `?${s}` : ""}`;
	};
	const toolName = (id: string) => toolById(id)?.name ?? id;
	const chip = (t: Entry) => {
		const l = me[t.id] ?? 0;
		return `<button type="button" class="rate" data-id="${t.id}" data-name="${esc(t.name)}" data-level="${l}" aria-label="${esc(`${t.name}: ${LEVEL_LABELS[l]}`)}" style="--c:${familyColor(t.family)}">${esc(t.name)}</button>`;
	};
	const tools = ROADMAP_TOOLS.filter((t) => t.family === fam);
	const result = rated
		? `<section id="result" class="result"><h2>${name ? `${esc(name)}'s portfolio` : "Your portfolio"}</h2>
<div class="pf-grid"><div>${spider(shape)}<p class="note">Skill shape across the ${FAMILIES.length} families, scaled to your strongest.</p></div>
<div><h3>Best-fit roles</h3>${
				best.length
					? `<ol class="fits">${best
							.map(
								(f) =>
									`<li><div class="fit-top"><strong>${esc(f.role.name)}</strong><span>${f.pct}%</span></div><div class="bar"><i style="width:${Math.min(100, f.pct)}%"></i></div>${f.noKey ? `<p class="note">Halved: none of its key tools rated (${f.keyGaps.slice(0, 3).map(toolName).map(esc).join(", ")}).</p>` : ""}${
										f.gaps.length
											? `<p class="note">Must-have you have not rated: ${f.gaps
													.slice(0, 4)
													.map(
														(id) =>
															`<a href="${root}/listing/${id}">${esc(toolName(id))}</a>`,
													)
													.join(", ")}</p>`
											: ""
									}</li>`,
							)
							.join("")}</ol>`
					: "<p>Rate a few more tools to see a match.</p>"
			}</div></div>
<h3>Rated tools</h3><p class="chiplist">${Object.keys(me)
				.map((id) => toolById(id))
				.filter((t): t is Entry => Boolean(t))
				.sort(
					(a, b) =>
						(me[b.id] ?? 0) - (me[a.id] ?? 0) || a.name.localeCompare(b.name),
				)
				.map(
					(t) =>
						`<a class="chip2" href="${root}/listing/${t.id}" style="--c:${familyColor(t.family)}">${esc(t.name)} <small>${"●".repeat(me[t.id] ?? 0)}</small></a>`,
				)
				.join("")}</p>
<div class="share"><h3>Share it</h3><p><button type="button" id="pf-copy" class="cta alt">Copy link</button> <a class="cta alt" href="${esc(`${root}/portfolio.md?${new URLSearchParams({ me: meString(me), ...(name ? { name } : {}) }).toString()}`)}" download="portfolio.md">Download Markdown</a> <button type="button" id="pf-publish" class="cta" hidden>Publish a CV to pages.flisk.si</button></p><p id="pf-publish-out" class="note" aria-live="polite">The link above holds your ratings, so anyone with it sees this page. Publishing a CV needs a GitHub sign-in (top right) and replaces the CV you may have published from the roadmap.</p></div></section>`
		: `<section class="result"><p>Rate the tools you know below, one level at a time: tap once for <b>${LEVEL_LABELS[1]}</b>, twice for <b>${LEVEL_LABELS[2]}</b>, three times for <b>${LEVEL_LABELS[3]}</b>, again to clear. Then press <b>See my result</b>.</p></section>`;
	return layout(
		base,
		{
			path: "portfolio",
			title: "Portfolio: your best-fit developer role",
			description:
				`Rate the developer tools you know from 0 to 3 and get your best-fit role, your skill shape across ${FAMILIES.length} families and a page to share. Nothing is stored.`.slice(
					0,
					160,
				),
			noindex: rated > 0 || Boolean(opts.family),
			crumbs: [{ name: "Portfolio", path: "portfolio" }],
		},
		`${hero("Portfolio", "Which developer role <em>fits you</em>?", "Rate the tools you know from 0 to 3. You get your best-fit roles, your skill shape and a link to share. The ratings live in the address, so nothing is stored.")}
<div id="pf" data-me="${esc(meString(me))}" data-path="${esc(`${root}/portfolio`)}" data-api="${esc(PUBLISH_API)}">
<p class="pf-bar"><label>Your name (optional) <input id="pf-name" maxlength="40" value="${esc(name)}" placeholder="Alex"></label> <span id="pf-count" class="note">${rated} rated</span> <a id="pf-see" class="cta" href="${esc(q(opts.family ? `family=${opts.family}` : ""))}#result">See my result</a></p>
${result}
<h2>Rate your tools</h2>
<nav class="subtabs" aria-label="Family">${FAMILIES.map((f) => `<a class="subtab" data-extra="family=${f.id}" href="${esc(q(`family=${f.id}`))}"${f.id === fam ? ' aria-current="page"' : ""}>${esc(f.name)}<small>${ROADMAP_TOOLS.filter((t) => t.family === f.id).length}</small></a>`).join("")}</nav>
<p class="note">Tap a tool to rate it: not rated, know of it, use it, know it well. Without JavaScript, open a result link someone shared.</p>
<p class="rates">${tools.map(chip).join("")}</p></div>
<script src="${root}/portfolio.js" defer></script>`,
		"portfolio",
	);
}
