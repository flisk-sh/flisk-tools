// The pages, rendered on the server. The only scripts are signin.js (the GitHub button and the theme toggle) and
// publish.js (the form on /publish). Each page passes its own PageMeta to head(), which writes every SEO tag.
import {
	counts,
	ENTRIES,
	type Entry,
	groups,
	hue,
	KINDS,
	kindLabel,
	mcpCommand,
	mcpCount,
	search,
	symbol,
} from "./catalog";
import { esc, faqJsonLd, head, type PageMeta } from "./seo";
import { SITE } from "./site";
import { STYLE } from "./styles";

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
<main id="main" class="wrap"><nav class="views" aria-label="Views">${tab("browse", `${root}/`, "Browse")}${tab("compass", `${root}/compass`, "Compass")}${tab("radar", `${root}/radar`, "Radar")}${tab("lab", `${root}/lab`, "Lab")}${tab("journeys", `${root}/journeys`, "Journeys")}${tab("roles", `${root}/roles`, "Roles")}${tab("skills", `${root}/skills`, "Skills")}${tab("ask", `${root}/ask`, "Ask")}${tab("portfolio", `${root}/portfolio`, "Portfolio")}</nav>
${body}</main>
<footer><div class="wrap">${esc(SITE.name)}: nothing stored here, no cookies. <a href="${esc(SITE.repo)}">Open source</a>, made by <a href="${esc(SITE.author.url)}">${esc(SITE.author.name)}</a>. Tools and skills come from the <a href="https://roadmap.flisk.si" rel="noopener">DevEx Roadmap</a>; wrong entry? <a href="${esc(SITE.repo)}/pulls" rel="noopener">Fix it on GitHub</a>.</div></footer>
<script src="${root}/signin.js" defer></script>
</body></html>`;
}

const stars = (n: number) =>
	n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

/** The listing's MCP server: how to add it to Claude Code or any MCP client, and what it offers. */
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
<p>${where}${m.registry ? `. In the official MCP Registry as <code>${esc(m.registry)}</code>` : ""}.</p>
<pre>${esc(mcpCommand(e))}</pre>
<p class="note">Or in any MCP client's config:</p><pre>${esc(json)}</pre>
${m.tools?.length ? `<p class="note">Tools: ${m.tools.map((t) => `<code>${esc(t)}</code>`).join(" ")}</p>` : ""}`;
}

export const card = (root: string, e: Entry) =>
	`<li class="card" style="${color(e.group === "Agent skills" ? e.category : e.group)}"><div class="top"><span class="sym" aria-hidden="true">${esc(symbol(e))}</span><h3><a href="${root}/listing/${e.id}">${esc(e.name)}</a></h3></div><p>${esc(e.tagline)}</p><div class="meta"><span class="g">${esc(kindLabel(e.kind))} · ${esc(e.category)}</span>${e.mcp ? `<span class="mcp">MCP</span>` : ""}${e.stars ? `<span>★ ${stars(e.stars)}</span>` : ""}${e.official ? `<span class="by">by Flisk</span>` : e.author ? `<span>@${esc(e.author)}</span>` : ""}</div></li>`;

interface Browse {
	q?: string;
	kind?: string;
	group?: string;
	mcp?: boolean;
	page?: number;
}

/** A link to the home page with this search, kept short: empty values are left out. */
export function homeHref(root: string, q: Browse): string {
	const p = new URLSearchParams();
	if (q.q) p.set("q", q.q);
	if (q.kind) p.set("kind", q.kind);
	if (q.group) p.set("group", q.group);
	if (q.mcp) p.set("mcp", "1");
	if (q.page && q.page > 1) p.set("page", String(q.page));
	const s = p.toString();
	return `${root}/${s ? `?${s}` : ""}`;
}

export function homePage(base: string, query: Browse = {}): string {
	const root = rootOf(base);
	const kind = KINDS.some((k) => k.id === query.kind) ? query.kind : undefined;
	const filtered = Boolean(
		query.q || kind || query.group || query.mcp || (query.page ?? 1) > 1,
	);
	const r = search({ ...query, kind });
	const link = (extra: Browse) =>
		esc(homeHref(root, { q: query.q, kind, mcp: query.mcp, ...extra }));
	const sub = (href: string, label: string, n: number, on: boolean) =>
		`<a class="subtab" href="${href}"${on ? ' aria-current="page"' : ""}>${label}<small>${n}</small></a>`;
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
<form class="search" role="search" action="${root}/" method="get"><input type="search" name="q" value="${esc(query.q ?? "")}" placeholder="Search ${ENTRIES.length} tools, skills and apps" aria-label="Search the store">${kind ? `<input type="hidden" name="kind" value="${kind}">` : ""}<button type="submit">Search</button></form>
<p class="note own-mcp">Add this store to your AI: <code>claude mcp add --transport http flisk-tools ${esc(base)}/mcp</code></p></section>
<nav class="subtabs" aria-label="Type">${sub(link({ kind: undefined }), "All", ENTRIES.length, !kind)}${KINDS.map((k) => sub(link({ kind: k.id }), esc(k.plural), counts(k.id), kind === k.id)).join("")}${sub(link({ mcp: !query.mcp, kind: undefined }), "With MCP", mcpCount(), Boolean(query.mcp))}</nav>
<nav class="subtabs" aria-label="Group">${groups(kind)
			.map((g) =>
				sub(
					link({ group: g.name }),
					esc(g.name),
					g.count,
					query.group === g.name,
				),
			)
			.join("")}</nav>
<p class="count">${r.total} ${r.total === 1 ? "result" : "results"}${query.q ? ` for “${esc(query.q)}”` : ""}</p>
${r.items.length ? `<ul class="grid">${r.items.map((e) => card(root, e)).join("")}</ul>` : `<p>Nothing matches. <a href="${root}/">Clear the search</a>, or <a href="${root}/publish">add it to the store</a>.</p>`}
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

export function listingPage(base: string, e: Entry): string {
	const root = rootOf(base);
	const path = `listing/${e.id}`;
	const related = search({ group: e.group })
		.items.filter((x) => x.id !== e.id)
		.slice(0, 6);
	return layout(
		base,
		{
			path,
			title: `${e.name}: ${kindLabel(e.kind)}, ${e.group}`.slice(0, 60),
			description: `${e.tagline}. ${e.description}`.slice(0, 160),
			crumbs: [{ name: e.name, path }],
		},
		`<section class="detail" style="${color(e.group === "Agent skills" ? e.category : e.group)}"><span class="sym" aria-hidden="true">${esc(symbol(e))}</span><div><p class="eyebrow">${esc(kindLabel(e.kind))} · ${esc(e.category)}</p><h1>${esc(e.name)}</h1><p class="lede">${esc(e.tagline)}</p><p><a class="cta" href="${esc(e.url)}" rel="noopener">Open ${esc(e.name)}</a>${e.repo ? ` <a class="cta alt" href="https://github.com/${esc(e.repo)}" rel="noopener">GitHub</a>` : ""}</p></div></section>
<p style="max-width:46rem">${esc(e.description)}</p>
<dl class="facts"><dt>Type</dt><dd>${esc(kindLabel(e.kind))}</dd><dt>Group</dt><dd><a href="${esc(homeHref(root, { group: e.group }))}">${esc(e.group)}</a></dd><dt>Category</dt><dd>${esc(e.category)}</dd>${e.author ? `<dt>By</dt><dd><a href="https://github.com/${esc(e.author)}" rel="noopener">@${esc(e.author)}</a>${e.official ? " (Flisk)" : ""}</dd>` : ""}${e.stars ? `<dt>GitHub stars</dt><dd>${e.stars.toLocaleString("en-US")}</dd>` : ""}${e.license ? `<dt>License</dt><dd>${esc(e.license)}</dd>` : ""}</dl>
${related.length ? `<h2>More in ${esc(e.group)}</h2><ul class="grid">${related.map((x) => card(root, x)).join("")}</ul>` : ""}
${e.mcp ? mcpPanel(e) : ""}
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
<p class="lede">Sign in with GitHub, fill in the form, and GitHub opens a pull request with your listing. When it is merged, it is in the store.</p>
<ol class="steps"><li>Sign in with GitHub (top right). We read only your public login.</li><li>Describe your app, tool or skill below.</li><li>GitHub opens a ready pull request. Press <b>Propose new file</b>, then <b>Create pull request</b>.</li><li>A check confirms the file is yours and well formed. Then it is merged.</li></ol>
<noscript><p>The form needs JavaScript. Without it, add a file named <code>listings/&lt;your github login&gt;--&lt;id&gt;.json</code> in the <a href="${esc(SITE.repo)}">repository</a>; the listings README shows the fields.</p></noscript>
<form id="pub" hidden data-repo="${esc(SITE.repo)}">
<p id="who" class="note"></p>
<label>Type <select name="kind"><option value="app">App (a website or service)</option><option value="tool">Dev tool</option><option value="skill">Agent skill</option></select></label>
<label>Name <input name="name" maxlength="60" required placeholder="Link Checker"></label>
<label>Id (lowercase, dashes) <input name="id" maxlength="60" required pattern="[a-z0-9][a-z0-9\\-]{0,60}" placeholder="link-checker"></label>
<label>One line, up to 120 characters <input name="tagline" maxlength="120" required placeholder="Find the broken links on a page"></label>
<label>Description, up to 600 characters <textarea name="description" maxlength="600" rows="4" required></textarea></label>
<label>Group <input name="group" maxlength="40" required placeholder="Web"></label>
<label>Category <input name="category" maxlength="40" required placeholder="Quality"></label>
<label>Address, https <input name="url" type="url" required placeholder="https://example.com"></label>
<label>GitHub repo, owner/name (needed for skills) <input name="repo" placeholder="you/link-checker"></label>
<label>MCP server address, https (if it has one) <input name="mcp_url" type="url" placeholder="https://example.com/mcp"></label>
<label>Or the command of a local MCP server <input name="mcp_command" maxlength="120" placeholder="npx -y @you/your-mcp"></label>
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
