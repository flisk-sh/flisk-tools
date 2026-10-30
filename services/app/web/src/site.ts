// Everything about the product that shows up in search results, link previews, AI answers and the app's own pages.
// Edit this file first (or run `bun run rename`): titles, meta tags, JSON-LD, robots.txt, sitemap.xml, llms.txt,
// site.webmanifest and security.txt are all built from it.

export const SITE = {
	name: "Flisk Tools",
	/** Under 60 characters: the <title> of the home page and the Product Hunt tagline. */
	tagline: "Run small web tools on your own GitHub, free",
	/** 140 to 160 characters: the meta description and the link preview text. */
	description:
		"A free store of small web and GitHub tools that run in your own GitHub Actions. Sign in with GitHub, click Run, get JSON. No server, no database, no keys.",
	/** Where the site lives online, ending in a slash. PUBLIC_URL overrides it at run time. */
	url: "https://flisk-tools.onrender.com/",
	repo: "https://github.com/flisk-sh/flisk-tools",
	lang: "en",
	locale: "en_US",
	/** The organization or person behind it, for JSON-LD and the footer. */
	author: { name: "Flisk", url: "https://flisk.sh" },
	/** An X handle with the @, or empty. */
	twitter: "",
	/** Matches the background of the page in each color scheme. */
	themeColor: { light: "#fbfaf7", dark: "#141413" },
	/** Where to report a security problem, for /.well-known/security.txt. */
	securityContact:
		"https://github.com/flisk-sh/flisk-tools/security/advisories/new",
	/** Shown on /about and sent as FAQPage JSON-LD. Write the questions people type into search and AI assistants. */
	faq: [
		{
			q: "Is this an Apify alternative?",
			a: "It covers the small end of it: run a script, get structured output. Tools run on GitHub Actions in your own fork instead of on a platform you pay for, so there are no proxies, no browser farms and no schedules faster than every 5 minutes.",
		},
		{
			q: "Who pays for the compute?",
			a: "You do, with your free GitHub Actions minutes. Runs in public repositories are free and unlimited. This site only serves pages, so it costs nothing to host and holds no data.",
		},
		{
			q: "What does signing in with GitHub allow?",
			a: "The console asks for the public_repo and workflow scopes so it can fork this repository to your account and start a run there. The token is handed to your browser once, through a relay that keeps and logs nothing, and then lives only in your browser's local storage. Every later call goes straight to GitHub.",
		},
		{
			q: "Where do results go?",
			a: "Each run commits a JSON file to the results branch of your fork. You own it, can read it on GitHub and can delete it any time.",
		},
		{
			q: "Is there an API or an MCP server?",
			a: "Yes: /api/tools lists the catalog as JSON, and /mcp is an MCP server with list_tools and get_tool, for Claude, ChatGPT, Cursor or Codex. Neither needs a key. Running a Tool needs your GitHub sign-in, so it happens in the console.",
		},
	],
} as const;
