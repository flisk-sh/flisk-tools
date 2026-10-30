// The two scripts on the site. Sign-in is publish.flisk.si, the service the DevEx Roadmap and Pages already use: it
// sends GitHub's sign-in, keeps no token and hands the page back a signed one-hour session that holds only the public
// login (#gh=<session>). The page keeps it for this tab (sessionStorage) and takes it out of the address bar.
// No backticks or template placeholders in here: these are plain strings until the browser runs them.
export const PUBLISH_API = "https://publish.flisk.si";

export const SIGNIN_JS = `(() => {
"use strict";
const API = ${JSON.stringify(PUBLISH_API)};
const KEY = "tools-gh";
const HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,38})$/;
function readSession() {
  let token = "";
  const m = /^#gh=(gh1\\.[\\w-]+\\.[\\w-]+)$/.exec(location.hash);
  if (m) {
    token = m[1];
    try { sessionStorage.setItem(KEY, token); } catch (e) {}
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  } else {
    try { token = sessionStorage.getItem(KEY) || ""; } catch (e) { token = ""; }
  }
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (HANDLE.test(payload.login) && payload.exp > Date.now() / 1000) return payload.login;
  } catch (e) {}
  try { sessionStorage.removeItem(KEY); } catch (e) {}
  return "";
}
const login = readSession();
window.toolsLogin = login;
window.toolsToken = login ? sessionStorage.getItem(KEY) || "" : "";
const slot = document.getElementById("gh-slot");
if (slot) {
  if (login) {
    const a = document.createElement("a");
    a.className = "gh-btn";
    a.href = "https://github.com/" + login;
    a.rel = "noopener";
    a.textContent = "@" + login;
    const out = document.createElement("button");
    out.type = "button";
    out.className = "gh-btn";
    out.textContent = "Sign out";
    out.addEventListener("click", () => { try { sessionStorage.removeItem(KEY); } catch (e) {} location.reload(); });
    slot.append(a, " ", out);
  } else {
    const a = document.createElement("a");
    a.className = "gh-btn";
    a.href = API + "/auth/github?return=" + encodeURIComponent(location.origin + location.pathname + location.search);
    a.textContent = "Sign in with GitHub";
    a.title = "We only read your public GitHub login.";
    slot.append(a);
  }
}
try { const t = localStorage.getItem("theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) {}
const tb = document.getElementById("theme-toggle");
if (tb) tb.addEventListener("click", () => {
  const dark = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && !matchMedia("(prefers-color-scheme: light)").matches);
  const next = dark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});
document.dispatchEvent(new CustomEvent("tools-login", { detail: login }));
})();
`;

export const PUBLISH_JS = `(() => {
"use strict";
const form = document.getElementById("pub");
const need = document.getElementById("need");
function show() {
  const login = window.toolsLogin || "";
  if (!login) return;
  form.hidden = false;
  need.hidden = true;
  document.getElementById("who").textContent = "Listing as @" + login;
}
document.addEventListener("tools-login", show);
show();
form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const login = window.toolsLogin;
  if (!login) return;
  const f = new FormData(form);
  const entry = {};
  for (const k of ["kind", "id", "name", "tagline", "description", "group", "category", "url", "repo"]) {
    const v = String(f.get(k) || "").trim();
    if (v) entry[k] = v;
  }
  const mcpUrl = String(f.get("mcp_url") || "").trim();
  const mcpCmd = String(f.get("mcp_command") || "").trim();
  if (mcpUrl) entry.mcp = { transport: "http", url: mcpUrl };
  else if (mcpCmd) entry.mcp = { transport: "stdio", command: mcpCmd };
  const json = JSON.stringify(entry, null, 2) + "\\n";
  const target = form.dataset.repo + "/new/main/listings?filename=" + encodeURIComponent("listings/" + login + "--" + entry.id + ".json") + "&value=" + encodeURIComponent(json);
  location.href = target;
});
})();
`;

export const PORTFOLIO_JS = `(() => {
"use strict";
const root = document.getElementById("pf");
if (!root) return;
const KEY = "tools-me";
const base = root.dataset.path;
const name = () => document.getElementById("pf-name").value.trim().slice(0, 40);
let me = {};
for (const part of (root.dataset.me || "").split(",")) { const m = /^(.+?)([1-3])$/.exec(part); if (m) me[m[1]] = Number(m[2]); }
const raw = () => Object.keys(me).sort().map((id) => id + me[id]).join(",");
const qs = (extra) => {
  const p = new URLSearchParams(extra || "");
  if (raw()) p.set("me", raw());
  if (name()) p.set("name", name());
  const s = p.toString();
  return base + (s ? "?" + s : "");
};
const LABELS = ["Not rated", "Know of it", "Use it", "Know it well"];
function sync() {
  try { history.replaceState(null, "", qs(new URLSearchParams(location.search).get("family") ? "family=" + new URLSearchParams(location.search).get("family") : "")); } catch (e) {}
  try { localStorage.setItem(KEY, raw()); } catch (e) {}
  for (const a of root.querySelectorAll("[data-extra]")) a.href = qs(a.dataset.extra);
  const see = document.getElementById("pf-see");
  if (see) see.href = qs("") + "#result";
  const n = document.getElementById("pf-count");
  if (n) n.textContent = Object.keys(me).length + " rated";
}
root.addEventListener("click", (ev) => {
  const b = ev.target.closest(".rate");
  if (!b) return;
  const next = (Number(b.dataset.level) + 1) % 4;
  b.dataset.level = String(next);
  b.setAttribute("aria-label", b.dataset.name + ": " + LABELS[next]);
  if (next) me[b.dataset.id] = next; else delete me[b.dataset.id];
  sync();
});
document.getElementById("pf-name").addEventListener("input", sync);
if (!new URLSearchParams(location.search).get("me")) {
  try { const saved = localStorage.getItem(KEY); if (saved) location.replace(base + "?me=" + encodeURIComponent(saved)); } catch (e) {}
}
const copy = document.getElementById("pf-copy");
if (copy) copy.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(location.origin + qs("")); copy.textContent = "Copied"; } catch (e) { copy.textContent = "Copy failed"; }
});
const pub = document.getElementById("pf-publish");
function showPublish() {
  if (pub && window.toolsToken) pub.hidden = false;
}
document.addEventListener("tools-login", showPublish);
showPublish();
if (pub) pub.addEventListener("click", async () => {
  const out = document.getElementById("pf-publish-out");
  out.textContent = "Publishing…";
  try {
    const r = await fetch(root.dataset.api + "/v1/me/space", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer " + window.toolsToken },
      body: JSON.stringify({ cv: { me: raw(), name: name() || undefined } }),
    });
    const j = await r.json();
    if (!r.ok) { out.textContent = j.error || "Could not publish (" + r.status + ")."; return; }
    out.textContent = "";
    const a = document.createElement("a");
    a.href = j.url; a.rel = "noopener"; a.textContent = j.url;
    out.append("Live in about two minutes at ", a, ". It replaces the CV you published from the roadmap.");
  } catch (e) { out.textContent = "Could not reach the publishing service."; }
});
})();
`;
