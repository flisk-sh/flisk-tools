# Flisk Runs

Run small web and GitHub tools on **your own GitHub**, free. A tiny Apify-style store with no server to pay for, no
database and no API keys: sign in with GitHub, click Run, get JSON.

## How it works

| Piece | Where it lives |
| --- | --- |
| The store (pages, catalog API, MCP server) | One free Render web service: Bun + Hono, nothing stored. `services/app/web/` |
| A tool | `tools/<id>/main.ts`: a default-exported function that takes the input and returns JSON |
| Running it | The console forks this repo to the signed-in person's account and starts `.github/workflows/run-tool.yml` there, on their free Actions minutes |
| Results | The workflow commits `<ticket>.json` to the `results` branch of the fork; the console reads it back |
| Sign-in | GitHub device flow with a public client id: no client secret anywhere |

The browser holds the token (localStorage) and calls `api.github.com` itself. The server only relays the two device-flow
form posts, because github.com sends no CORS headers; it keeps and logs nothing.

## Run it locally

```bash
cd services/app/web
bun install
GITHUB_CLIENT_ID=<your OAuth App client id> bun run dev   # http://localhost:4000
bun test && bun run typecheck && bun run lint
cd ../../.. && bun test tools                              # the Tools' own tests
```

Or with Flisk: `flisk up`. Without `GITHUB_CLIENT_ID` the store works and the console says sign-in is not set up.

## Add a Tool

1. `tools/<id>/main.ts` with `export default async function main(input: Record<string, string>)` returning JSON.
2. An entry in `services/app/web/src/tools.ts` (name, tagline, inputs, example). A test fails if the folder is missing.
3. Open a pull request.

## Limits, said plainly

- It is not Apify: no proxies, no browser farm, no private storage, no schedules faster than 5 minutes. Actions IPs are
  blocked by some sites. A run is capped at 15 minutes here (GitHub allows 6 hours).
- The person pays with their Actions minutes. Public forks are free; private ones use the monthly allowance.
- A new fork starts with Actions off. The console turns it on through the API; if GitHub refuses, enable it on the
  fork's Actions tab once.
- Forks drift from this repo. Sync the fork (GitHub's **Sync fork** button) to get new Tools.

Deploy: [DEPLOY.md](DEPLOY.md). MIT licensed.
