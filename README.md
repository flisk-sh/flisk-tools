# Flisk Tools

**Every dev tool, agent skill and app, in one free store.** A public, searchable marketplace in the spirit of the
Apify Store, with no server to pay for, no database and no API keys. Sign in with GitHub to add yours.

## What is in it

| Kind | Where it comes from |
| --- | --- |
| Apps | Flisk's own: Flisk CLI, README Score, Citable, Helpdock, Command Comparer, Pages, the DevEx Roadmap and more (`catalog/flisk.json`) |
| Dev tools | The 376 tools of the [DevEx Roadmap](https://roadmap.flisk.si), with live GitHub stars (`catalog/roadmap.json`) |
| Agent skills | The 400 agent skills of the roadmap |
| Yours | One JSON file per listing in `listings/`, added by pull request |

Search, filters and pages live in the address (`/?q=docker&kind=skill&page=2`), so every view is a link and the site
needs no JavaScript to browse. A listing opens where it lives: its own website or GitHub repository.

## Views

Browse and Lab, plus the DevEx Roadmap's views drawn from its data: Compass, Radar, Journeys, Roles, Skills, Ask (compare
tools side by side) and Portfolio (rate the tools you know, get your best-fit roles and a link to share; the ratings live
in the address, nothing is stored). All are drawn on the server; only Portfolio's editor needs JavaScript.

## How it works

- **The store** is one Bun + Hono service on Render's free plan. The catalog is one JSON file built into the image
  (`src/catalog.generated.json`); nothing is stored at run time.
- **Sign-in** is [publish.flisk.si](https://publish.flisk.si), the service the roadmap and Pages already use. It sends the visitor
  through GitHub, keeps no token and hands back a signed one-hour session that holds only the public login. The page keeps it in
  `sessionStorage` for that tab.
- **Publishing** is a pull request. `/publish` (signed in) builds a file named `listings/<login>--<id>.json` and opens
  GitHub's "new file" page for it. A check confirms the name starts with the author's login; after the merge, a
  workflow rebuilds the catalog. The author shown in the store comes from the file name, never from the file.
- **API and MCP**: `/api/tools?q=docker` and `/mcp` (`search_store`, `get_listing`), no key.

## Run it locally

```bash
cd services/app/web
bun install
bun run dev          # http://localhost:4000
bun test && bun run typecheck && bun run lint
```

Or with Flisk: `flisk up`.

## Change the catalog

```bash
bun run catalog                                   # rebuild src/catalog.generated.json from catalog/ and listings/
bun scripts/import-roadmap.ts ../path/to/roadmap  # refresh catalog/roadmap.json from a flisk-sh/roadmap checkout
```

## Limits, said plainly

- It lists and links; it does not run anything for you. Apify runs your code on its servers, which is the part that
  costs money. Running a tool in the browser or on GitHub Actions would be a separate feature.
- Sign-in proves a GitHub login to this site. It does not give the site access to your GitHub account.
- Ratings, reviews and download counts need a database and are not here. GitHub stars stand in.

Deploy: [DEPLOY.md](DEPLOY.md). MIT licensed.
