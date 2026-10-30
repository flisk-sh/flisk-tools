// The pages, rendered on the server. The only scripts are signin.js (the GitHub button and the theme toggle) and
// publish.js (the form on /publish). Each page passes its own PageMeta to head(), which writes every SEO tag.
import {
	counts,
	ENTRIES,
	type Entry,
	facets,
	hue,
	KINDS,
	kindLabel,
	mcpCommand,
	mcpCount,
	search,
	symbol,
} from "./catalog";
import { jumpLinks } from "./jump";
import { esc, faqJsonLd, head, type PageMeta } from "./seo";
import { SITE } from "./site";
import { STYLE } from "./styles";
import { ageOf, DATA_FETCHED, DX, PARITY, RINGS as RING_DEFS } from "./views";

export type View =
	| "browse"
	| "compass"
	| "radar"
	| "lab"
	| "journeys"
	| "roles"
	| "skills"
	| "ask"
	| "portfolio"
	| "";

const FONTS = `<link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

export const rootOf = (base: string) =>
	new URL(`${base}/`).pathname.replace(/\/$/, "");
export const color = (name: string) => `--c:hsl(${hue(name)} 70% 58%)`;

export function layout(
	base: string,
	meta: PageMeta,
	body: string,
	view: View = "",
): string {
	const root = rootOf(base);
	const tab = (id: View, href: string, label: string) =>
		`<a class="view-tab" href="${href}"${view === id ? ' aria-current="page"' : ""}>${label}</a>`;
	return `<!doctype html><html lang="${SITE.lang}"><head>
${head(base, meta)}
${FONTS}
<style>${STYLE}</style></head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap bar"><a class="brand" href="${root}/"><img src="${root}/icon.svg" alt="" width="20" height="20"><span>${esc(SITE.name)}</span></a>
<span class="hook">${ENTRIES.length} listings · ${counts("app")} apps · ${counts("tool")} dev tools · ${counts("skill")} agent skills · ${mcpCount()} with an MCP server · free, no signup to browse</span>
<nav class="nav" aria-label="Primary"><a href="${root}/publish">Publish</a><a class="nav-extra" href="${root}/about">About</a><a class="nav-extra" href="${esc(SITE.repo)}" rel="noopener">GitHub</a><span id="gh-slot"></span><button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch theme">Theme</button></nav></div></header>
<main id="main" class="wrap"><nav class="views" aria-label="Views">${tab("browse", `${root}/`, "Browse")}${tab("compass", `${root}/compass`, "Compass")}${tab("radar", `${root}/radar`, "Radar")}${tab("lab", `${root}/lab`, "Lab")}${tab("journeys", `${root}/journeys`, "Journeys")}${tab("roles", `${root}/roles`, "Roles")}${tab("skills", `${root}/skills`, "Skills")}${tab("ask", `${root}/ask`, "Compare")}${tab("portfolio", `${root}/portfolio`, "Portfolio")}</nav>
${body}</main>
<footer><div class="wrap">${esc(SITE.name)}: nothing stored here, no cookies. <a href="${esc(SITE.repo)}">Open source</a>, made by <a href="${esc(SITE.author.url)}">${esc(SITE.author.name)}</a>. Tools and skills come from the <a href="https://roadmap.flisk.si" rel="noopener">DevEx Roadmap</a>; wrong entry? <a href="${esc(SITE.repo)}/pulls" rel="noopener">Fix it on GitHub</a>. <a href="${root}/rate">Rate this site</a> (2 questions).</div></footer>
<script src="${root}/signin.js" defer></script>
</body></html>`;
}

const stars = (n: number) =>
	n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

/** The listing's MCP server: how to add it to Claude Code or any MCP client, and what it offers. */
/** How to use an agent skill: it is a folder with a SKILL.md that the agent reads. */
function skillInstall(e: Entry): string {
	const m = /\/blob\/[^/]+\/(.+)\/SKILL\.md$/.exec(e.url);
	const folder = m?.[1] ?? "";
	const safe =
		/^[\w./-]+$/.test(folder) && /^[\w.-]+\/[\w.-]+$/.test(e.repo ?? "");
	const name = folder.split("/").pop() ?? e.id;
	return `<h2>Install it</h2><p class="note">A skill is a folder your AI agent reads. Put it in the agent's skills folder: for Claude Code, <code>~/.claude/skills/</code> for every project, or <code>.claude/skills/</code> for one.</p>${safe ? `<p class="note">Most skills are one file, so use this. It writes only that file into your home folder; you can read the SKILL.md on GitHub first:</p><pre>${esc(`mkdir -p ~/.claude/skills/${name} && curl -fsSL https://raw.githubusercontent.com/${e.repo}/HEAD/${folder}/SKILL.md -o ~/.claude/skills/${name}/SKILL.md`)}</pre><p class="note">Use this one instead only if the skill's folder has other files next to SKILL.md:</p><pre>${esc(`git clone --depth 1 https://github.com/${e.repo} /tmp/skill-src && cp -r /tmp/skill-src/${folder} ~/.claude/skills/${name}`)}</pre>` : ""}`;
}

/** One plain sentence on what kind of thing a listing is and how a visitor uses it. */
function whatIs(e: Entry): string {
	let host = "";
	try {
		host = new URL(e.url).hostname;
	} catch {
		host = "";
	}
	if (e.kind === "skill")
		return "An agent skill: a file your AI coding agent reads. Open it on GitHub, copy it into your agent's skills folder.";
	if (host === "github.com")
		return e.kind === "app"
			? "A project on GitHub: open it to read how to install and run it."
			: "A developer tool: its GitHub page has the install steps.";
	return e.kind === "app"
		? `A website: it opens in your browser at ${host}.`
		: `A developer tool: its home page is ${host}; install steps are there.`;
}

function mcpPanel(e: Entry): string {
	const m = e.mcp;
	if (!m) return "";
	const where =
		m.transport === "http"
			? `Remote server, no key: <code>${esc(m.url ?? "")}</code>`
			: `Local server, runs on your machine: <code>${esc(m.command ?? "")}</code>`;
	const json =
		m.transport === "http"
			? `{ "mcpServers": { "${e.id}": { "type": "http", "url": "${m.url}" } } }`
			: `{ "mcpServers": { "${e.id}": { "command": "${(m.command ?? "").split(" ")[0]}", "args": ${JSON.stringify((m.command ?? "").split(" ").slice(1))} } } }`;
	return `<h2>Use it from your AI <span class="tag mcp">MCP</span></h2>
<p class="note">MCP is how AI assistants like Claude plug into a tool. Run the command below once and your assistant can use it.</p>
<p>${where}${m.registry ? `. In the official MCP Registry as <code>${esc(m.registry)}</code>` : ""}.</p>
<pre>${esc(mcpCommand(e))}</pre>
<p class="note">Or in any MCP client's config:</p><pre>${esc(json)}</pre>
${m.tools?.length ? `<p class="note">Tools: ${m.tools.map((t) => `<code>${esc(t)}</code>`).join(" ")}</p>` : ""}`;
}

export const card = (root: string, e: Entry, proof?: string) =>
	`<li class="card" style="${color(e.group === "Agent skills" ? e.category : e.group)}"><div class="top"><span class="sym" aria-hidden="true">${esc(symbol(e))}</span><h3><a href="${root}/listing/${e.id}">${esc(e.name)}</a>${e.kind === "skill" && e.repo ? `<small class="src">${esc(e.repo)}</small>` : ""}</h3></div><p>${esc(e.tagline)}</p>${proof ? `<p class="proof">✓ ${esc(proof)}</p>` : ""}<div class="meta"><span class="g">${esc(kindLabel(e.kind))} · ${esc(e.category)}</span>${e.archived ? `<span class="rk r-hold" title="Archived: no longer maintained">Archived</span>` : ""}${e.ring ? `<span class="rk r-${e.ring}" title="Maturity: ${e.ring}">${e.ring === "adopt" ? "Adopt" : e.ring === "trial" ? "Trial" : e.ring === "assess" ? "Assess" : "Hold"}</span>` : ""}${e.mcp ? `<span class="mcp">MCP</span>` : ""}${e.stars ? `<span title="${e.kind === "skill" ? "Stars of the whole repository" : "GitHub stars"}">★ ${stars(e.stars)}${e.kind === "skill" ? " repo" : ""}</span>` : ""}${e.official ? `<span class="by">by Flisk</span>` : e.kind === "skill" && e.repo ? `<span title="Source repository">${esc(e.repo)}</span>` : e.author ? `<span>@${esc(e.author)}</span>` : ""}</div></li>`;

const RING_IDS = ["adopt", "trial", "assess", "hold"];
const RING_FILTERS = [
	{ id: "adopt", label: "Adopt" },
	{ id: "trial", label: "Trial" },
	{ id: "assess", label: "Assess" },
	{ id: "hold", label: "Hold" },
];
/** Checks from the roadmap's "easy to use" list that people look for by name. */
const FILTER_CHECKS = [
	{ id: "offline", label: "Runs offline, no account" },
	{ id: "one-command", label: "One command starts it" },
	{ id: "agent-ready", label: "AI can drive it" },
	{ id: "cross-platform", label: "Mac, Linux, Windows" },
];

interface Browse {
	q?: string;
	kind?: string;
	group?: string;
	mcp?: boolean;
	ring?: string;
	check?: string;
	category?: string;
	sort?: string;
	page?: number;
}

/** A link to the home page with this search, kept short: empty values are left out. */
export function homeHref(root: string, q: Browse): string {
	const p = new URLSearchParams();
	if (q.q) p.set("q", q.q);
	if (q.kind) p.set("kind", q.kind);
	if (q.group) p.set("group", q.group);
	if (q.mcp) p.set("mcp", "1");
	if (q.ring) p.set("ring", q.ring);
	if (q.check) p.set("check", q.check);
	if (q.category) p.set("category", q.category);
	if (q.sort === "stars" || q.sort === "easy") p.set("sort", q.sort);
	if (q.page && q.page > 1) p.set("page", String(q.page));
	const s = p.toString();
	return `${root}/${s ? `?${s}` : ""}`;
}

export function homePage(base: string, query: Browse = {}): string {
	const root = rootOf(base);
	const kind = KINDS.some((k) => k.id === query.kind) ? query.kind : undefined;
	const ring = RING_IDS.includes(query.ring ?? "") ? query.ring : undefined;
	const checks = (query.check ?? "")
		.split(",")
		.filter((k) => FILTER_CHECKS.some((c) => c.id === k));
	const check = checks.length ? checks.join(",") : undefined;
	const category = ENTRIES.some((e) => e.category === query.category)
		? query.category
		: undefined;
	const filtered = Boolean(
		query.q ||
			kind ||
			query.group ||
			query.mcp ||
			ring ||
			check ||
			category ||
			(query.page ?? 1) > 1,
	);
	// A check filter matches many tools, so with no query and no chosen sort, the ones that meet the most checks come first.
	const sortKey: "stars" | "easy" | undefined =
		query.sort === "stars" || query.sort === "easy"
			? query.sort
			: check && !query.q
				? "easy"
				: undefined;
	const base0 = {
		...query,
		kind,
		ring,
		check,
		category,
		sort: sortKey,
	};
	const r = search(base0);
	const f = facets(base0);
	const link = (extra: Browse) =>
		esc(
			homeHref(root, {
				q: query.q,
				kind,
				group: query.group,
				mcp: query.mcp,
				ring,
				check,
				category,
				sort: sortKey,
				...extra,
			}),
		);
	const sub = (
		href: string,
		label: string,
		n: number | undefined,
		on: boolean,
	) =>
		`<a class="subtab" href="${href}"${on ? ' aria-current="page"' : ""}>${label}${n === undefined ? "" : `<small>${n}</small>`}</a>`;
	const jumps = jumpLinks(query.q, root);
	// Several tools to choose between: offer them side by side (skills and apps have no ring, so they are not compared).
	const rated = r.items.filter((e) => e.ring);
	const topCompare =
		query.q && rated.length >= 3 && r.total >= 4
			? rated.slice(0, 3)
			: undefined;
	const ringCount = (id: string) =>
		query.q ? undefined : facets({ ...base0, ring: id }).total;
	const toggled = (id: string) =>
		(checks.includes(id)
			? checks.filter((k) => k !== id)
			: [...checks, id]
		).join(",") || undefined;
	const checkCount = (id: string) =>
		query.q ? undefined : facets({ ...base0, check: toggled(id) }).total;
	const filterRow = `<nav class="subtabs filters" aria-label="Filters"><span class="flabel">Maturity</span>${RING_FILTERS.map((x) => sub(link({ ring: ring === x.id ? undefined : x.id }), esc(x.label), ringCount(x.id), ring === x.id)).join("")}<span class="flabel">Works</span>${FILTER_CHECKS.map((c) => sub(link({ check: toggled(c.id) }), esc(c.label), checkCount(c.id), checks.includes(c.id))).join("")}</nav>`;
	const none = `<div class="empty"><p><b>Nothing matches${query.q ? ` “${esc(query.q)}”` : " these filters"}.</b></p><ul><li>Try fewer or different words, like <a href="${root}/?q=docker">docker</a> or <a href="${root}/?q=k8s">k8s</a>.</li><li>Clear the filters and <a href="${root}/">browse everything</a>.</li><li>Looking for a path or a job? See <a href="${root}/journeys">Journeys</a> and <a href="${root}/roles">Roles</a>.</li><li>Missing from the store? <a href="${root}/publish">Add it.</a></li></ul></div>`;
	return layout(
		base,
		{
			path: "",
			title: `${SITE.name}: ${SITE.tagline}`,
			description: SITE.description,
			noindex: filtered,
		},
		`<section class="hero"><p class="eyebrow">Free · open source · no server, no database</p><h1>Every dev tool, agent skill and app, <em>in one free store</em></h1>
<p class="lede">${esc(SITE.description)}</p>
<form class="search" role="search" action="${root}/" method="get"><input type="search" name="q" value="${esc(query.q ?? "")}" placeholder="Search ${ENTRIES.length} tools, skills and apps: try docker, k8s, code review" aria-label="Search the store">${kind ? `<input type="hidden" name="kind" value="${kind}">` : ""}<button type="submit">Search</button></form>
<div class="callout"><b>Use this store from your AI</b><code>claude mcp add --transport http flisk-tools ${esc(base)}/mcp</code><small>Claude Code. Tools: search_store, get_listing. No key needed. <a href="${root}/listing/flisk-tools">More</a></small></div></section>
${filtered ? "" : `<section class="start" aria-label="Start here"><a href="${root}/?q=docker"><b>Find a tool</b><small>Search ${counts("tool")} dev tools by what they do</small></a><a href="${root}/roles"><b>Which role fits me?</b><small>Type the tools you know</small></a><a href="${root}/journeys"><b>Learn a path</b><small>Seven levels, three routes</small></a><a href="${root}/ask?q=yarn+vs+pnpm+vs+bun"><b>Compare tools</b><small>Side by side, from the data</small></a></section>`}
<nav class="subtabs" aria-label="Type">${sub(link({ kind: undefined }), "All", f.total, !kind)}${KINDS.map((k) => sub(link({ kind: k.id }), esc(k.plural), f.kinds[k.id] ?? 0, kind === k.id)).join("")}${sub(link({ mcp: !query.mcp, kind: undefined }), "With MCP", facets({ ...base0, mcp: true }).total, Boolean(query.mcp))}</nav>
<details class="facetbox"${query.group || ring || check || category ? " open" : ""}><summary>Narrow it down: group, maturity, what it works with</summary><nav class="subtabs" aria-label="Group">${f.groups.map((g) => sub(link({ group: g.name }), esc(g.name), g.count, query.group === g.name)).join("")}</nav>
${
	f.categories.length > 1
		? `<nav class="subtabs" aria-label="Category"><span class="flabel">Category</span>${f.categories
				.slice(0, 14)
				.map((c) =>
					sub(
						link({ category: category === c.name ? undefined : c.name }),
						`${esc(c.name)}${category === c.name ? " ×" : ""}`,
						c.count,
						category === c.name,
					),
				)
				.join("")}</nav>`
		: ""
}
${filterRow}</details>
${category ? `<p class="jumps"><span class="flabel">Category</span><a class="chip2" href="${link({ category: undefined })}">${esc(category)} ×</a></p>` : ""}
${check ? `<p class="note">${esc(DX.criteria.find((c) => c.id === check)?.help ?? "")} This is the roadmap's checklist answer, not a test run here: check the tool's own page before relying on it. Many tools meet it, so combine it with a search.</p>` : ""}
${topCompare ? `<p class="jumps"><span class="flabel">Choosing?</span><a class="chip2 jump-compare" href="${root}/ask?q=${encodeURIComponent(topCompare.map((t) => t.name).join(" vs "))}">Compare the top ${topCompare.length}: ${topCompare.map((t) => esc(t.name)).join(", ")}</a></p>` : ""}
${jumps.length ? `<p class="jumps"><span class="flabel">Jump to</span>${jumps.map((j) => `<a class="chip2 jump-${j.kind}" href="${esc(j.href)}">${esc(j.label)}</a>`).join("")}</p>` : ""}
<p class="count">${r.total} ${r.total === 1 ? "result" : "results"}${query.q ? ` for “${esc(query.q)}”` : ""} · Sort: ${(
			[
				[undefined, query.q ? "Best match" : "Official first"],
				["stars", "Most starred"],
				["easy", "Easiest to use"],
			] as const
		)
			.map(([k, label]) =>
				sortKey === k
					? `<b>${label}</b>`
					: `<a href="${link({ sort: k })}">${label}</a>`,
			)
			.join(" · ")}</p>
${r.items.length ? `<ul class="grid">${r.items.map((e) => card(root, e, checks.length ? checks.map((k) => FILTER_CHECKS.find((c) => c.id === k)?.label).join(" · ") : undefined)).join("")}</ul>` : none}
<p class="pager"><span>${r.page > 1 ? `<a rel="prev" href="${link({ group: query.group, page: r.page - 1 })}">← Previous</a>` : ""}</span><span>Page ${r.page} of ${r.pages}</span><span>${r.page < r.pages ? `<a rel="next" href="${link({ group: query.group, page: r.page + 1 })}">Next →</a>` : ""}</span></p>`,
		"browse",
	);
}

/** The Lab: every listing as an element tile in a periodic table, one block per group (or per category when a kind has one group). */
export function labPage(base: string, kindParam?: string): string {
	const root = rootOf(base);
	const kind = KINDS.find((k) => k.id === kindParam)?.id ?? "tool";
	const items = ENTRIES.filter((e) => e.kind === kind);
	const byGroup = new Set(items.map((e) => e.group)).size > 1;
	const blocks = new Map<string, Entry[]>();
	for (const e of items) {
		const key = byGroup ? e.group : e.category;
		blocks.set(key, [...(blocks.get(key) ?? []), e]);
	}
	let d = 0;
	const tile = (e: Entry, i: number) => {
		const sym = symbol(e);
		d += 6;
		return `<a class="tile" href="${root}/listing/${e.id}" title="${esc(`${e.name}: ${e.tagline}`)}" style="--d:${Math.min(d, 900)}ms"><span class="t-n">${i + 1}</span>${e.license ? `<span class="t-lic">${esc(e.license.slice(0, 4))}</span>` : ""}<span class="t-sym">${esc(sym)}</span><span class="t-name">${esc(e.name)}</span></a>`;
	};
	return layout(
		base,
		{
			path: "lab",
			title: `Lab: every ${kindLabel(kind).toLowerCase()} as an element`,
			description:
				`${items.length} ${kindLabel(kind).toLowerCase()}s from ${SITE.name} laid out like a periodic table, one block per ${byGroup ? "family" : "category"}. Click a tile to open it.`.slice(
					0,
					160,
				),
			noindex: kind !== "tool",
			crumbs: [{ name: "Lab", path: "lab" }],
		},
		`<section class="hero"><p class="eyebrow">Lab</p><h1>The store as a <em>periodic table</em></h1>
<p class="lede">Every tile is a listing, ordered by stars inside its block. Hover for the one-liner, click to open it.</p></section>
<nav class="subtabs" aria-label="Type">${KINDS.map((k) => `<a class="subtab" href="${root}/lab?kind=${k.id}"${kind === k.id ? ' aria-current="page"' : ""}>${esc(k.plural)}<small>${counts(k.id)}</small></a>`).join("")}</nav>
<div class="lab">${[...blocks]
			.map(
				([name, list]) =>
					`<section class="lab-block" style="${color(name)}"><h3>${esc(name)} <small>${list.length}</small></h3><div class="lab-grid">${list.map(tile).join("")}</div></section>`,
			)
			.join("")}</div>
<p class="legend">Number: rank in its block · top right: license · symbol: first letters of the name</p>`,
		"lab",
	);
}

/** What a visitor weighs a tool by: maturity ring, how easy, how big-system ready, and the checks it meets. */
function glance(e: Entry): string {
	if (!e.ring) return "";
	const ring = RING_DEFS.find((r) => r.id === e.ring);
	const met = (e.dx ?? [])
		.map((id) => DX.criteria.find((c) => c.id === id))
		.filter(Boolean);
	const big = (e.parity ?? [])
		.map((id) => PARITY.criteria.find((c) => c.id === id))
		.filter(Boolean);
	return `<h2>At a glance</h2><dl class="facts"><dt>Maturity</dt><dd><span class="rk r-${e.ring}">${esc(ring?.label ?? e.ring)}</span>: ${esc(ring?.help ?? "")}</dd><dt>Easy to use</dt><dd>${(e.dx?.length ?? 0) * 10} / 100</dd><dt>Big, real systems</dt><dd>${(e.parity?.length ?? 0) * 10} / 100</dd>${e.version ? `<dt>Latest release</dt><dd>${esc(e.version.replace(/^.*\//, ""))}${e.release ? `, ${esc(e.release)}` : ""}</dd>` : ""}${e.pushed ? `<dt>Last push</dt><dd>${esc(e.pushed)}</dd>` : ""}${e.created ? `<dt>Repository created</dt><dd>${esc(e.created)} (${esc(ageOf(e.created))} ago)</dd>` : ""}${e.archived ? `<dt>Status</dt><dd><span class="rk r-hold">Archived</span>: the repository is read-only and no longer maintained</dd>` : ""}</dl>
${met.length ? `<p class="note">Easy to use because it: ${met.map((c) => (c?.id === "offline" ? `Runs offline, no account (${esc((c.help ?? "").replace(/\.$/, "").toLowerCase())})` : esc(c?.label ?? ""))).join(" · ")}</p>` : ""}${big.length ? `<p class="note">Fits big systems because it: ${big.map((c) => esc(c?.label ?? "")).join(" · ")}</p>` : ""}<p class="note">The ring and these checks are the <a href="https://roadmap.flisk.si" rel="noopener">DevEx Roadmap</a>'s checklist answers, not a test run here${DATA_FETCHED ? `; GitHub numbers fetched ${esc(DATA_FETCHED)}` : ""}.${e.evidence ? ` <a href="${esc(e.evidence)}" rel="noopener">Evidence for the ring</a>.` : ""}</p>`;
}

export function listingPage(base: string, e: Entry): string {
	const root = rootOf(base);
	const path = `listing/${e.id}`;
	const related = search({ group: e.group })
		.items.filter((x) => x.id !== e.id)
		.slice(0, 6);
	// Several repositories publish a skill with the same name; say so, and say how to tell them apart.
	const sameName =
		e.kind === "skill"
			? ENTRIES.filter(
					(x) => x.kind === "skill" && x.name === e.name && x.id !== e.id,
				)
			: [];
	const similar = search({ category: e.category, kind: e.kind })
		.items.filter((x) => x.id !== e.id && x.ring)
		.slice(0, 2);
	return layout(
		base,
		{
			path,
			title: `${e.name}: ${kindLabel(e.kind)}, ${e.group}`.slice(0, 60),
			description: `${e.tagline}. ${e.description}`.slice(0, 160),
			crumbs: [{ name: e.name, path }],
		},
		`<section class="detail" style="${color(e.group === "Agent skills" ? e.category : e.group)}"><span class="sym" aria-hidden="true">${esc(symbol(e))}</span><div><p class="eyebrow">${esc(kindLabel(e.kind))} · ${esc(e.category)}</p><h1>${esc(e.name)}</h1><p class="lede">${esc(e.tagline)}</p><p class="note">${esc(whatIs(e))}</p><p><a class="cta" href="${esc(e.url)}" rel="noopener">Open ${esc(e.name)}</a>${e.repo ? ` <a class="cta alt" href="https://github.com/${esc(e.repo)}" rel="noopener">GitHub</a>` : ""}</p></div></section>
<p style="max-width:46rem">${esc(e.description)}</p>
${e.kind === "skill" ? skillInstall(e) : ""}
${e.install ? `<h2>Typical install</h2><pre>${esc(e.install)}</pre><p class="note">The usual way on macOS or Linux (Homebrew, npm or a script). For Windows and other systems, use the steps on the tool's own page.</p>` : ""}
${sameName.length ? `<h2>Same name, other repositories</h2><p class="note">${sameName.length + 1} skills are called “${esc(e.name)}”. They are different files from different authors: compare their one-liners and sources. They also install into the same folder, so keep one, or rename the folder if you want both.</p><ul class="verdict">${sameName.map((x) => `<li><a href="${root}/listing/${x.id}">${esc(x.repo ?? x.id)}</a>${x.stars ? ` <span class="note">★ ${stars(x.stars)} (whole repo)</span>` : ""}: ${esc(x.tagline)}</li>`).join("")}</ul>` : ""}
${e.mcp ? mcpPanel(e) : ""}
<dl class="facts"><dt>Type</dt><dd>${esc(kindLabel(e.kind))}</dd><dt>Group</dt><dd><a href="${esc(homeHref(root, { group: e.group }))}">${esc(e.group)}</a></dd><dt>Category</dt><dd><a href="${esc(homeHref(root, { category: e.category }))}">${esc(e.category)}</a></dd>${e.author ? `<dt>By</dt><dd><a href="https://github.com/${esc(e.author)}" rel="noopener">@${esc(e.author)}</a>${e.official ? " (Flisk)" : ""}</dd>` : ""}${e.stars ? `<dt>${e.kind === "skill" ? "GitHub stars (whole repo)" : "GitHub stars"}</dt><dd>${e.stars.toLocaleString("en-US")}${e.repo ? ` <span class="note">(${esc(e.repo)})</span>` : ""}</dd>` : ""}${e.license ? `<dt>License</dt><dd>${esc(e.license)}</dd>` : ""}</dl>
${glance(e)}
${similar.length >= 1 && e.ring ? `<p><a class="cta alt" href="${root}/ask?q=${encodeURIComponent([e.name, ...similar.map((s) => s.name)].join(" vs "))}">Compare with ${similar.map((s) => esc(s.name)).join(" and ")}</a></p>` : ""}
${related.length ? `<h2>More in ${esc(e.group)}</h2><ul class="grid">${related.map((x) => card(root, x)).join("")}</ul>` : ""}
<h2>Read it from code</h2><pre>curl '${esc(base)}/api/tools/${e.id}'</pre>`,
		"browse",
	);
}

export function publishPage(base: string): string {
	const root = rootOf(base);
	return layout(
		base,
		{
			path: "publish",
			title: "Add yours to the store",
			description:
				`Sign in with GitHub and add your app, dev tool or agent skill to ${SITE.name} with one pull request. Free, open source.`.slice(
					0,
					160,
				),
			crumbs: [{ name: "Publish", path: "publish" }],
		},
		`<div class="prose"><p class="eyebrow">Publish</p><h1>Add yours to the <em>store</em></h1>
<p class="lede">Browsing the store needs no sign-in. To add a listing, sign in with GitHub, fill in the form, and GitHub opens a pull request with it. When it is merged, it is in the store.</p>
<details open><summary>Listing rules</summary><p class="note">A maintainer checks every pull request for: a public address that opens; an honest one-line description of what it does; open source or free to try; no duplicate of an existing listing; and for a skill, a real GitHub repo. There is no fixed review time. Maturity rings and scores come from the <a href="https://github.com/flisk-sh/roadmap" rel="noopener">DevEx Roadmap</a>'s checklist, so to get one, add the tool there with a source. Stars shown are GitHub's.</p></details>
<details open><summary>What you will fill in</summary><p class="note">Type (app, dev tool or agent skill) · Name · Id (lowercase, dashes) · One line (up to 120 characters) · Description (up to 600) · Group · Category · Address (https) · GitHub repo (needed for a skill) · MCP server address or command (optional). No JavaScript? Add a file named <code>listings/&lt;your github login&gt;--&lt;id&gt;.json</code> in the repository instead, like this:</p><pre>{"kind":"tool","id":"link-checker","name":"Link Checker","tagline":"Find the broken links on a page","description":"Paste a page address and get every broken link on it.","group":"Web","category":"Quality","url":"https://example.com"}</pre></details>
<ol class="steps"><li>Sign in with GitHub (top right). We read only your public login.</li><li>Describe your app, tool or skill below.</li><li>GitHub opens a ready pull request. On GitHub press the green <b>Commit changes…</b>, then <b>Propose changes</b>, then <b>Create pull request</b>.</li><li>A check confirms the file is yours and well formed. Then it is merged.</li></ol>
<noscript><p>The form needs JavaScript. Without it, add a file named <code>listings/&lt;your github login&gt;--&lt;id&gt;.json</code> in the <a href="${esc(SITE.repo)}">repository</a>; the listings README shows the fields.</p></noscript>
<form id="pub" hidden data-repo="${esc(SITE.repo)}">
<p id="who" class="note"></p>
<label>Type <select name="kind"><option value="app">App (a website or service)</option><option value="tool">Dev tool</option><option value="skill">Agent skill</option></select></label>
<label>Name <input name="name" maxlength="60" required placeholder="Link Checker"></label>
<label>Id (lowercase, dashes) <input name="id" maxlength="60" required pattern="[a-z0-9][a-z0-9\\-]{0,60}" placeholder="link-checker"></label>
<label>One line, up to 120 characters <input name="tagline" maxlength="120" required placeholder="Find the broken links on a page"></label>
<label>Description, up to 600 characters <textarea name="description" maxlength="600" rows="4" required></textarea></label>
<label>Group <input name="group" maxlength="40" required placeholder="Web" list="dl-groups"></label>
<label>Category <input name="category" maxlength="40" required placeholder="Quality" list="dl-cats"></label>
<label>Address, https <input name="url" type="url" required placeholder="https://example.com"></label>
<label>GitHub repo, owner/name (needed for skills) <input name="repo" placeholder="you/link-checker"></label>
<label>MCP server address, https (if it has one) <input name="mcp_url" type="url" placeholder="https://example.com/mcp"></label>
<label>Or the command of a local MCP server <input name="mcp_command" maxlength="120" placeholder="npx -y @you/your-mcp"></label>
<datalist id="dl-groups">${[...new Set(ENTRIES.map((x) => x.group))].map((g) => `<option value="${esc(g)}">`).join("")}</datalist><datalist id="dl-cats">${[
			...new Set(ENTRIES.map((x) => x.category)),
		]
			.slice(0, 120)
			.map((g) => `<option value="${esc(g)}">`)
			.join("")}</datalist>
<button type="submit">Open the pull request</button></form>
<p id="need" class="note">Sign in with GitHub to see the form.</p></div>
<script src="${root}/publish.js" defer></script>`,
	);
}

export function aboutPage(base: string): string {
	return layout(
		base,
		{
			path: "about",
			title: "About and FAQ",
			description:
				`How ${SITE.name} works, what it stores and how to call it from code or an AI assistant. ${SITE.tagline}.`.slice(
					0,
					160,
				),
			jsonLd: [faqJsonLd()],
			crumbs: [{ name: "About", path: "about" }],
		},
		`<div class="prose"><p class="eyebrow">About</p><h1>${esc(SITE.name)}</h1>
<p class="lede">${esc(SITE.description)}</p>
<h2>Questions</h2>
<dl>${SITE.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>
<h2>Use it from an AI assistant</h2>
<pre>claude mcp add --transport http ${esc(SITE.name.toLowerCase().replace(/ /g, "-"))} ${esc(base)}/mcp</pre></div>`,
	);
}

export function notFoundPage(base: string): string {
	const root = rootOf(base);
	return layout(
		base,
		{
			path: "404",
			title: "Page not found",
			description: `This address is not a page on ${SITE.name}. Search the store from the home page.`,
			noindex: true,
		},
		`<div class="prose"><h1>Page not found</h1><p class="lede">There is no page at this address. <a href="${root}/">Search the store</a>.</p></div>`,
	);
}

export function ratePage(base: string): string {
	const root = rootOf(base);
	const scale = (name: string) =>
		`<div class="scale" role="radiogroup" aria-label="${name}"><span class="note">Strongly disagree</span>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<label><input type="radio" name="${name === "capabilities" ? "c" : "e"}" value="${n}" required><span>${n}</span></label>`).join("")}<span class="note">Strongly agree</span></div>`;
	return layout(
		base,
		{
			path: "rate",
			title: "Rate this site: two questions",
			description:
				`Two questions, 30 seconds: does ${SITE.name} meet your needs and is it easy to use? Your answer opens a prefilled GitHub issue.`.slice(
					0,
					160,
				),
			noindex: true,
		},
		`<div class="prose"><p class="eyebrow">Rate this site</p><h1>Two questions, <em>thirty seconds</em></h1>
<p class="lede">This is UMUX-Lite, a standard short usability survey. Your answers open a prefilled GitHub issue; press Submit there. Nothing is stored here, and you need a GitHub account to submit.</p>
<form id="rate" action="${root}/umux" method="get">
<fieldset><legend>1. This site's capabilities meet my requirements.</legend>${scale("capabilities")}</fieldset>
<fieldset><legend>2. This site is easy to use.</legend>${scale("easy")}</fieldset>
<label>What would make it better? (optional) <textarea name="note" maxlength="600" rows="3" placeholder="The one thing you could not find or that confused you"></textarea></label>
<button type="submit">Open the GitHub issue</button></form></div>`,
	);
}
