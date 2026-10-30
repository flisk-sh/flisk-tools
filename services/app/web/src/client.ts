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
