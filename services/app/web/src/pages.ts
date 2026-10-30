// The pages, rendered on the server. The only scripts are signin.js (the GitHub button) and publish.js (the form on
// /publish). Each page passes its own PageMeta to head(), which writes every SEO tag.
import {
	counts,
	ENTRIES,
	type Entry,
	groups,
	KINDS,
	kindLabel,
	search,
} from "./catalog";
import { esc, faqJsonLd, head, type PageMeta } from "./seo";
import { SITE } from "./site";

const STYLE = `
:root{--bg:${SITE.themeColor.light};--fg:#141413;--muted:#66635c;--line:#e3e0d7;--card:#fff;--sunk:#efede7;--pass:#18794e;--fail:#c22a1f;--accent:#2d4cc8;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:${SITE.themeColor.dark};--fg:#eceae4;--muted:#a29f97;--line:#272a31;--card:#16181d;--sunk:#1c1f25;--pass:#4fcf8e;--fail:#ff7b72;--accent:#8ea2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:3px}.wrap{max-width:820px;margin:0 auto;padding:0 20px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.stage{position:relative;overflow:hidden;background:#07080c;color:#f4f3ef;--fg:#f4f3ef;--muted:#b0afba;--line:#262833;--card:#11131a;--sunk:#1b1e28;--accent:#9db0ff;--pass:#4ade80;--fail:#ff7b72}
.stage::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(60% 65% at 50% 30%,#000 25%,transparent 100%);mask-image:radial-gradient(60% 65% at 50% 30%,#000 25%,transparent 100%);pointer-events:none}
.stage::after{content:"";position:absolute;inset:-10%;background:radial-gradient(38% 32% at 22% 18%,rgba(91,124,255,.38),transparent 70%),radial-gradient(32% 30% at 82% 30%,rgba(74,222,128,.24),transparent 70%),radial-gradient(40% 36% at 55% 95%,rgba(168,85,247,.3),transparent 70%);pointer-events:none}
.stage>*{position:relative;z-index:1}
header.top{background:#07080c;border-bottom:1px solid #1d2029}header.top::before,header.top::after{display:none}
header.top .wrap{max-width:1080px;display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:60px;font-size:15px}
header.top a{color:var(--muted);text-decoration:none}header.top a:first-child{color:var(--fg);font-weight:750;font-size:17px;display:flex;gap:10px;align-items:center}header.top img{border-radius:6px}
.hero{padding:72px 0 0;text-align:center}.hero.short{padding-bottom:64px}
h1{font-size:clamp(34px,6.5vw,60px);line-height:1.04;letter-spacing:-.04em;font-weight:800;margin:0 auto 16px;max-width:16ch}
.grad{background:linear-gradient(92deg,#9db0ff,#c084fc 48%,#4ade80);-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:clamp(22px,3.4vw,30px);letter-spacing:-.025em;margin:56px 0 14px;font-weight:780}
.lede{color:var(--muted);font-size:clamp(17px,2.3vw,19px);max-width:600px;margin:0 auto 30px}
form{display:inline-flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 10px 10px 18px}
.stage form{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14)}
label{display:flex;gap:10px;align-items:center;font-weight:600;color:var(--muted)}
input[type=color]{width:52px;height:44px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--card);cursor:pointer}
button{font:inherit;font-weight:650;padding:12px 22px;border:0;border-radius:10px;background:linear-gradient(135deg,#5b7cff,#8b5cf6);color:#fff;cursor:pointer;box-shadow:0 8px 24px -10px rgba(91,124,255,.8)}button:hover{background:linear-gradient(135deg,#6d8bff,#a06bff)}
.chips{margin:18px 0 0;font-size:13px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.chip{display:inline-flex;gap:6px;align-items:center;text-decoration:none;color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:4px 12px;background:var(--card);font-family:var(--mono)}.chip:hover{border-color:var(--accent)}
.stage .chip{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14)}
.sw{width:14px;height:14px;border-radius:50%;border:1px solid rgba(127,127,127,.4);display:inline-block;vertical-align:-2px}
.ratio{font-size:clamp(64px,15vw,120px);line-height:1;margin:0 auto 14px}
.sample{border-radius:16px;padding:32px 28px;border:1px solid var(--line);margin:40px 0 20px;box-shadow:0 20px 50px -30px rgba(20,20,40,.5)}.sample p{margin:0}.sample .big{font-size:26px;font-weight:750;margin-bottom:6px}
ul.levels{list-style:none;padding:0;margin:16px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
ul.levels li{display:flex;justify-content:space-between;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:12px;padding:12px 14px}
.pass,.fail{font-weight:750;font-size:13px;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);border-radius:999px;padding:2px 10px}
.pass{--c:var(--pass)}.fail{--c:var(--fail)}li:has(.pass){--c:var(--pass)}li:has(.fail){--c:var(--fail)}
pre{background:#0e0f12;color:#e8e6e1;border:1px solid #272a31;border-radius:12px;padding:14px 16px;overflow-x:auto;font:13px/1.6 var(--mono);white-space:pre-wrap;word-break:break-all}
dt{font-weight:700;margin-top:20px;font-size:17px}dd{margin:6px 0 0;color:var(--muted)}
.prose{padding:56px 0 0}.prose h1{text-align:left;margin:0 0 14px}.prose .lede{margin:0 0 28px}
footer{margin-top:96px;border-top:1px solid var(--line);padding:26px 0 44px;color:var(--muted);font-size:14px}
.hero{padding:48px 0 0}
@media (min-width:980px){.hero:not(.short){padding:56px 0 64px}.hero:not(.short) .wrap{max-width:1080px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);column-gap:56px;align-items:center;text-align:left}.hero:not(.short) .wrap>*{grid-column:1}.hero:not(.short) h1{margin:0 0 16px;font-size:clamp(40px,4.4vw,56px)}.hero:not(.short) .lede{margin:0 0 26px;font-size:18px}.hero:not(.short) form{justify-self:start}.hero:not(.short) .chips{justify-content:flex-start}}
@media (max-width:560px){form{padding:12px;justify-content:flex-start}button{width:100%}}
.reassure{margin:12px 0 0;font-size:13px;color:var(--muted)}.reassure b{color:var(--pass)}
.preview{--fg:#141413;--muted:#5d5a53;--line:#e6e3da;--sunk:#f3f1ec;--pass:#18794e;--fail:#c22a1f;margin:44px auto 0;max-width:520px;text-align:left;background:#fff;color:var(--fg);border-radius:18px;padding:18px;box-shadow:0 40px 100px -30px rgba(91,124,255,.65),0 0 0 1px rgba(255,255,255,.08)}
.preview .top{display:flex;align-items:center;gap:10px;font:600 12.5px var(--mono);color:var(--muted);margin-bottom:12px}.preview .top em{margin-left:auto;white-space:nowrap;font:600 11px ui-sans-serif,system-ui,sans-serif;font-style:normal;text-transform:uppercase;letter-spacing:.08em;background:var(--sunk);border-radius:6px;padding:3px 8px}
.preview .swatch{border-radius:12px;padding:18px;border:1px solid var(--line);display:flex;align-items:end;justify-content:space-between;gap:12px}.preview .swatch b{font-size:46px;line-height:1;letter-spacing:-.04em}.preview .swatch span{font-size:14px;max-width:18ch;text-align:right}
.preview ul{list-style:none;margin:10px 0 0;padding:0}.preview li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line);font-size:14px}.preview li:last-child{border-bottom:0}
.preview .fixit{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--pass) 9%,#fff);font-size:14px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);margin:56px 0 0;border-top:1px solid var(--line);text-align:left}
.stats div{padding:24px 20px 28px 0}.stats div+div{padding-left:20px;border-left:1px solid var(--line)}
.stats b{display:block;font-size:clamp(30px,4vw,48px);line-height:1;font-weight:800;letter-spacing:-.04em}.stats span{display:block;margin-top:8px;color:var(--muted);font-size:14px;line-height:1.4;max-width:22ch}
.kick{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:72px 0 10px}.kick+h2{margin-top:0}
.film{margin:0;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:#07080c}.film .chrome{display:flex;gap:7px;padding:12px 14px;border-bottom:1px solid #1d2029}.film .chrome i{width:11px;height:11px;border-radius:50%;background:#2a2d38}
.film video,.film img{display:block;width:100%;height:auto}.film .still{display:none}
@media (prefers-reduced-motion:reduce){.film video{display:none}.film .still{display:block}}
@media (max-width:640px){.stats{grid-template-columns:1fr 1fr}.stats div{padding:18px 12px 20px 0}.stats div+div{padding-left:12px}.stats div:nth-child(3){padding-left:0;border-left:0}.stats div:nth-child(n+3){border-top:1px solid var(--line)}}
@media (min-width:980px){.hero:not(.short) .preview{grid-column:2;grid-row:1/span 5;margin:0;justify-self:end;width:100%}.hero:not(.short) .stats{grid-column:1/-1}.hero:not(.short){padding-bottom:0}}
`;

const EXTRA = `
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:18px 0 0;padding:0;list-style:none}
.grid li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;position:relative}
.grid li:hover{border-color:var(--accent)}.grid h3{margin:0;font-size:18px;letter-spacing:-.02em}.grid h3 a{color:var(--fg);text-decoration:none}.grid h3 a::after{content:"";position:absolute;inset:0}
.grid p{margin:0;color:var(--muted);font-size:14.5px}.grid .meta{margin-top:auto;font-size:12.5px;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap}
.tag{align-self:flex-start;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--accent);background:var(--sunk);border-radius:6px;padding:3px 8px}
.official{color:var(--pass)}
.navr{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:flex-end}#gh-slot{display:inline-flex;gap:8px}
.cta{display:inline-block;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#5b7cff,#8b5cf6);color:#fff;box-shadow:0 8px 24px -10px rgba(91,124,255,.8)}
.cta.alt{background:transparent;color:var(--fg);box-shadow:none;border:1px solid var(--line)}
.search{display:flex;gap:10px;max-width:640px;margin:0 auto;padding:8px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)}
.search input{flex:1;min-width:0;font:inherit;padding:12px 14px;border-radius:10px;border:0;background:#0b0c12;color:#f4f3ef}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:28px 0 8px}.tabs a,.chips2 a{text-decoration:none;color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:14px;background:var(--card)}
.tabs a[aria-current],.chips2 a[aria-current]{background:var(--accent);color:var(--bg);border-color:var(--accent)}.tabs small,.chips2 small{color:var(--muted);margin-left:6px}.tabs a[aria-current] small,.chips2 a[aria-current] small{color:inherit;opacity:.8}
.chips2{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 6px}.chips2 a{padding:3px 11px;font-size:13px}
.pager{display:flex;justify-content:space-between;align-items:center;margin:26px 0 0;color:var(--muted);font-size:14px}.pager a{color:var(--accent)}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:6px 22px;margin:22px 0}.facts dt{margin:0;font-size:14px;color:var(--muted)}.facts dd{margin:0}
.steps{counter-reset:s;list-style:none;padding:0;margin:18px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.steps li{counter-increment:s;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;font-size:15px}.steps li::before{content:counter(s);display:block;font:800 28px/1 var(--mono);color:var(--accent);margin-bottom:8px}
#pub{display:flex;flex-direction:column;align-items:stretch;border-radius:16px;padding:18px;gap:14px;background:var(--card);border:1px solid var(--line)}
#pub label{display:flex;flex-direction:column;align-items:stretch;gap:6px}#pub input,#pub select,#pub textarea{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
button:disabled{opacity:.6;cursor:not-allowed}.gh-btn{display:inline-flex;gap:8px;align-items:center;color:var(--fg)!important;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 12px;font-size:14px;background:transparent;cursor:pointer;font-weight:600;text-decoration:none}
`;

function layout(base: string, meta: PageMeta, body: string): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
	return `<!doctype html><html lang="${SITE.lang}"><head>
${head(base, meta)}
<style>${STYLE}${EXTRA}</style></head><body>
<header class="top stage"><nav class="wrap" aria-label="Site"><a href="${root}/"><img src="${root}/icon.svg" alt="" width="26" height="26">${esc(SITE.name)}</a><span class="navr"><a href="${root}/publish">Publish</a><a href="${root}/about">About</a><span id="gh-slot"></span></span></nav></header>
<main>${body}</main>
<footer><div class="wrap">${esc(SITE.name)}: nothing stored here, no cookies. <a href="${SITE.repo}">Open source</a>, made by <a href="${SITE.author.url}">${esc(SITE.author.name)}</a>.</div></footer>
<script src="${root}/signin.js" defer></script>
</body></html>`;
}

const stars = (n: number) =>
	n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const card = (root: string, e: Entry) =>
	`<li><span class="tag">${esc(kindLabel(e.kind))}</span><h3><a href="${root}/listing/${e.id}">${esc(e.name)}</a></h3><p>${esc(e.tagline)}</p><div class="meta"><span>${esc(e.group)}</span>${e.stars ? `<span>★ ${stars(e.stars)}</span>` : ""}${e.official ? `<span class="official">by Flisk</span>` : e.author ? `<span>@${esc(e.author)}</span>` : ""}</div></li>`;

/** A link to the home page with this search, kept short: empty values are left out. */
export function homeHref(
	root: string,
	q: { q?: string; kind?: string; group?: string; page?: number },
): string {
	const p = new URLSearchParams();
	if (q.q) p.set("q", q.q);
	if (q.kind) p.set("kind", q.kind);
	if (q.group) p.set("group", q.group);
	if (q.page && q.page > 1) p.set("page", String(q.page));
	const s = p.toString();
	return `${root}/${s ? `?${s}` : ""}`;
}

export function homePage(
	base: string,
	query: { q?: string; kind?: string; group?: string; page?: number } = {},
): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
	const kind = KINDS.some((k) => k.id === query.kind) ? query.kind : undefined;
	const filtered = Boolean(
		query.q || kind || query.group || (query.page ?? 1) > 1,
	);
	const r = search({ ...query, kind });
	const gs = groups(kind);
	const link = (extra: object) =>
		esc(homeHref(root, { q: query.q, kind, ...extra }));
	return layout(
		base,
		{
			path: "",
			title: `${SITE.name}: ${SITE.tagline}`,
			description: SITE.description,
			noindex: filtered,
		},
		`<section class="hero short stage"><div class="wrap"><h1 class="grad">${esc(SITE.tagline)}</h1>
<p class="lede">${esc(SITE.description)}</p>
<form class="search" role="search" action="${root}/" method="get"><input type="search" name="q" value="${esc(query.q ?? "")}" placeholder="Search ${ENTRIES.length} tools, skills and apps" aria-label="Search the store">${kind ? `<input type="hidden" name="kind" value="${kind}">` : ""}<button type="submit">Search</button></form>
<p class="reassure"><b>●</b> Free · Open source · Sign in with GitHub to add yours</p></div></section>
<div class="wrap"><nav class="tabs" aria-label="Type"><a href="${link({ kind: undefined })}"${kind ? "" : ' aria-current="page"'}>All<small>${ENTRIES.length}</small></a>${KINDS.map((k) => `<a href="${link({ kind: k.id })}"${kind === k.id ? ' aria-current="page"' : ""}>${esc(k.plural)}<small>${counts(k.id)}</small></a>`).join("")}</nav>
<nav class="chips2" aria-label="Group">${gs.map((g) => `<a href="${link({ group: g.name })}"${query.group === g.name ? ' aria-current="page"' : ""}>${esc(g.name)}<small>${g.count}</small></a>`).join("")}</nav>
<h2>${r.total} ${r.total === 1 ? "result" : "results"}${query.q ? ` for “${esc(query.q)}”` : ""}</h2>
${r.items.length ? `<ul class="grid">${r.items.map((e) => card(root, e)).join("")}</ul>` : `<p>Nothing matches. <a href="${root}/">Clear the search</a>, or <a href="${root}/publish">add it to the store</a>.</p>`}
<p class="pager"><span>${r.page > 1 ? `<a rel="prev" href="${link({ group: query.group, page: r.page - 1 })}">← Previous</a>` : ""}</span><span>Page ${r.page} of ${r.pages}</span><span>${r.page < r.pages ? `<a rel="next" href="${link({ group: query.group, page: r.page + 1 })}">Next →</a>` : ""}</span></p></div>`,
	);
}

export function listingPage(base: string, e: Entry): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
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
		`<section class="hero short stage"><div class="wrap"><span class="tag">${esc(kindLabel(e.kind))}</span><h1 class="grad">${esc(e.name)}</h1>
<p class="lede">${esc(e.tagline)}</p><a class="cta" href="${esc(e.url)}" rel="noopener">Open ${esc(e.name)}</a>${e.repo ? ` <a class="cta alt" href="https://github.com/${esc(e.repo)}" rel="noopener">GitHub</a>` : ""}</div></section>
<div class="wrap"><p>${esc(e.description)}</p>
<dl class="facts"><dt>Type</dt><dd>${esc(kindLabel(e.kind))}</dd><dt>Group</dt><dd><a href="${esc(homeHref(root, { group: e.group }))}">${esc(e.group)}</a></dd><dt>Category</dt><dd>${esc(e.category)}</dd>${e.author ? `<dt>By</dt><dd><a href="https://github.com/${esc(e.author)}" rel="noopener">@${esc(e.author)}</a>${e.official ? " (Flisk)" : ""}</dd>` : ""}${e.stars ? `<dt>GitHub stars</dt><dd>${e.stars.toLocaleString("en-US")}</dd>` : ""}${e.license ? `<dt>License</dt><dd>${esc(e.license)}</dd>` : ""}</dl>
${related.length ? `<h2>More in ${esc(e.group)}</h2><ul class="grid">${related.map((x) => card(root, x)).join("")}</ul>` : ""}
<h2>Read it from code</h2><pre>curl '${esc(base)}/api/tools/${e.id}'</pre></div>`,
	);
}

export function publishPage(base: string): string {
	return layout(
		base,
		{
			path: "publish",
			title: "Add yours to the store",
			description:
				`Sign in with GitHub and add your app, dev tool or agent skill to ${SITE.name} with one pull request. Free, no review queue to join.`.slice(
					0,
					160,
				),
			crumbs: [{ name: "Publish", path: "publish" }],
		},
		`<div class="wrap prose"><h1>Add yours to the store</h1>
<p class="lede">Sign in with GitHub, fill in the form, and GitHub opens a pull request with your listing. When it is merged, it is in the store.</p>
<ol class="steps"><li>Sign in with GitHub (top right). We read only your public login.</li><li>Describe your app, tool or skill below.</li><li>GitHub opens a ready pull request. Press <b>Propose new file</b>, then <b>Create pull request</b>.</li><li>A check confirms the file is yours and well formed. Then it is merged.</li></ol>
<noscript><p>The form needs JavaScript. Without it, add a file named <code>listings/&lt;your github login&gt;--&lt;id&gt;.json</code> in the <a href="${SITE.repo}">repository</a>; the README shows the fields.</p></noscript>
<form id="pub" hidden data-repo="${esc(SITE.repo)}">
<p id="who" class="reassure"></p>
<label>Type <select name="kind"><option value="app">App (a website or service)</option><option value="tool">Dev tool</option><option value="skill">Agent skill</option></select></label>
<label>Name <input name="name" maxlength="60" required placeholder="Link Checker"></label>
<label>Id (lowercase, dashes) <input name="id" maxlength="60" required pattern="[a-z0-9][a-z0-9\\-]{0,60}" placeholder="link-checker"></label>
<label>One line, up to 120 characters <input name="tagline" maxlength="120" required placeholder="Find the broken links on a page"></label>
<label>Description, up to 600 characters <textarea name="description" maxlength="600" rows="4" required></textarea></label>
<label>Group <input name="group" maxlength="40" required placeholder="Web"></label>
<label>Category <input name="category" maxlength="40" required placeholder="Quality"></label>
<label>Address, https <input name="url" type="url" required placeholder="https://example.com"></label>
<label>GitHub repo, owner/name (needed for skills) <input name="repo" placeholder="you/link-checker"></label>
<button type="submit">Open the pull request</button></form>
<p id="need" class="reassure">Sign in with GitHub to see the form.</p></div>
<script src="${new URL(`${base}/`).pathname.replace(/\/$/, "")}/publish.js" defer></script>`,
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
		`<div class="wrap prose"><h1>About ${esc(SITE.name)}</h1>
<p class="lede">${esc(SITE.description)}</p>
<h2>Questions</h2>
<dl>${SITE.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>
<h2>Use it from an AI assistant</h2>
<pre>claude mcp add --transport http ${esc(SITE.name.toLowerCase().replace(/ /g, "-"))} ${esc(base)}/mcp</pre></div>`,
	);
}

export function notFoundPage(base: string): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
	return layout(
		base,
		{
			path: "404",
			title: "Page not found",
			description: `This address is not a page on ${SITE.name}. Search the store from the home page.`,
			noindex: true,
		},
		`<div class="wrap prose"><h1>Page not found</h1><p class="lede">There is no page at this address. <a href="${root}/">Search the store</a>.</p></div>`,
	);
}
