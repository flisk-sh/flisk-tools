// The one script on the site, served at /console.js and allowed only on /console. It signs in with GitHub's device
// flow (the server relays two form posts because github.com sends no CORS headers; the token itself never touches the
// server), forks the repository, starts run-tool.yml in the fork and waits for results/<ticket>.json. Every call to
// api.github.com is made by the browser with the person's own token, kept in localStorage.
//
// No backticks or template placeholders in here: it is a plain string until the browser runs it.
export const CONSOLE_JS = `(() => {
const app = document.getElementById("app");
const d = app.dataset;
const KEY = "tools-token";
const out = document.getElementById("log");
const say = (text) => { const p = document.createElement("p"); p.textContent = text; out.appendChild(p); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const token = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const keep = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {} };

const gh = (path, init) => fetch("https://api.github.com" + path, Object.assign({}, init, {
  headers: Object.assign({
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    authorization: "Bearer " + token(),
  }, init && init.body ? { "content-type": "application/json" } : {}, init && init.headers),
}));

async function signIn() {
  if (!d.client) { say("Sign-in is not set up on this site yet: GITHUB_CLIENT_ID is missing."); return false; }
  const r = await fetch(d.root + "/auth/device", { method: "POST" });
  const c = await r.json();
  if (!r.ok || !c.device_code) { say("GitHub did not start a sign-in: " + (c.error_description || c.error || r.status)); return false; }
  const box = document.getElementById("code");
  box.hidden = false;
  box.querySelector("b").textContent = c.user_code;
  const a = box.querySelector("a");
  a.href = c.verification_uri;
  a.textContent = c.verification_uri;
  let wait = (c.interval || 5) * 1000;
  const until = Date.now() + (c.expires_in || 900) * 1000;
  while (Date.now() < until) {
    await sleep(wait);
    const t = await (await fetch(d.root + "/auth/token", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_code: c.device_code }),
    })).json();
    if (t.access_token) { keep(t.access_token); box.hidden = true; return true; }
    if (t.error === "slow_down") wait += 5000;
    else if (t.error !== "authorization_pending") { say("Sign-in stopped: " + (t.error_description || t.error)); box.hidden = true; return false; }
  }
  say("The code expired. Try again.");
  return false;
}

async function ensureFork(login) {
  const [owner, name] = d.repo.split("/");
  if (login.toLowerCase() === owner.toLowerCase()) return d.repo;
  const mine = login + "/" + name;
  if ((await gh("/repos/" + mine)).ok) return mine;
  say("Forking " + d.repo + " to your account…");
  const f = await gh("/repos/" + d.repo + "/forks", { method: "POST", body: JSON.stringify({ default_branch_only: true }) });
  if (!f.ok) throw new Error("GitHub would not fork it (" + f.status + ").");
  for (let i = 0; i < 20; i++) { await sleep(3000); if ((await gh("/repos/" + mine)).ok) return mine; }
  throw new Error("The fork is not ready yet. Run again in a minute.");
}

async function run(tool, input) {
  out.textContent = "";
  if (!token() && !(await signIn())) return;
  let me = await gh("/user");
  if (me.status === 401) { keep(null); if (!(await signIn())) return; me = await gh("/user"); }
  if (!me.ok) throw new Error("GitHub answered " + me.status + " for your account.");
  const login = (await me.json()).login;
  say("Signed in as " + login + ".");
  const repo = await ensureFork(login);
  // A fresh fork starts with Actions off; turning it on is allowed with the workflow scope.
  await gh("/repos/" + repo + "/actions/permissions", { method: "PUT", body: JSON.stringify({ enabled: true }) });
  const ticket = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  say("Starting " + tool.id + " in " + repo + "…");
  let started = false;
  for (let i = 0; i < 10 && !started; i++) {
    const r = await gh("/repos/" + repo + "/actions/workflows/" + d.workflow + "/dispatches", {
      method: "POST", body: JSON.stringify({ ref: d.ref, inputs: { tool: tool.id, input: JSON.stringify(input), ticket } }),
    });
    if (r.status === 204) started = true;
    else if (r.status === 404) await sleep(4000);
    else throw new Error("GitHub would not start the run (" + r.status + ").");
  }
  if (!started) throw new Error("The workflow is not in your fork yet. Run again in a minute.");
  const link = document.createElement("a");
  link.href = "https://github.com/" + repo + "/actions";
  link.textContent = "Watch it on GitHub";
  out.appendChild(link);
  say("Waiting for the result. A run takes about 20 to 60 seconds.");
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const r = await gh("/repos/" + repo + "/contents/" + ticket + ".json?ref=" + d.branch, { headers: { accept: "application/vnd.github.raw+json" } });
    if (r.ok) {
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(JSON.parse(await r.text()), null, 2);
      out.appendChild(pre);
      return;
    }
  }
  say("No result after 10 minutes. Check the run on GitHub.");
}

async function main() {
  const list = await (await fetch(d.root + "/api/tools")).json();
  const sel = document.getElementById("tool");
  for (const a of list.tools) { const o = document.createElement("option"); o.value = a.id; o.textContent = a.name; sel.appendChild(o); }
  const fields = document.getElementById("fields");
  const draw = () => {
    fields.textContent = "";
    const a = list.tools.find((x) => x.id === sel.value);
    document.getElementById("about").textContent = a.tagline;
    for (const i of a.inputs) {
      const l = document.createElement("label");
      l.textContent = i.label + " ";
      const e = document.createElement("input");
      e.name = i.name; e.placeholder = i.placeholder; e.required = i.required;
      e.value = (new URLSearchParams(location.search).get(i.name)) || (a.example && a.example[i.name]) || "";
      l.appendChild(e);
      fields.appendChild(l);
    }
  };
  const want = new URLSearchParams(location.search).get("tool");
  if (want && list.tools.some((a) => a.id === want)) sel.value = want;
  sel.addEventListener("change", draw);
  draw();
  document.getElementById("form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const a = list.tools.find((x) => x.id === sel.value);
    const input = {};
    for (const e of fields.querySelectorAll("input")) input[e.name] = e.value.trim();
    const btn = ev.target.querySelector("button");
    btn.disabled = true;
    try { await run(a, input); } catch (e) { say(e.message || String(e)); }
    btn.disabled = false;
  });
  document.getElementById("signout").addEventListener("click", () => { keep(null); say("Signed out of this browser."); });
}
main().catch((e) => say(e.message || String(e)));
})();
`;
