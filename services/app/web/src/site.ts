// Everything about the product that shows up in search results, link previews, AI answers and the app's own pages.
// Edit this file first (or run `bun run rename`): titles, meta tags, JSON-LD, robots.txt, sitemap.xml, llms.txt,
// site.webmanifest and security.txt are all built from it.

export const SITE = {
	name: "Flisk Tools",
	/** Under 60 characters: the <title> of the home page and the Product Hunt tagline. */
	tagline: "Every dev tool, agent skill and app, in one free store",
	/** 140 to 160 characters: the meta description and the link preview text. */
	description:
		"A free, open store of developer tools, AI agent skills and Flisk apps. Search any of them, and sign in with GitHub to add your own. No server, no database.",
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
	themeColor: { light: "#f6f6f4", dark: "#08080c" },
	/** Where to report a security problem, for /.well-known/security.txt. */
	securityContact:
		"https://github.com/flisk-sh/flisk-tools/security/advisories/new",
	/** Shown on /about and sent as FAQPage JSON-LD. Write the questions people type into search and AI assistants. */
	faq: [
		{
			q: "Is this an Apify alternative?",
			a: "It is a store in the same spirit: a public catalog where anyone can find and publish tools. It lists things that live elsewhere (a website, a GitHub repository, an agent skill) instead of running them on servers we pay for, so it costs nothing to host and holds no data.",
		},
		{
			q: "What is in the store?",
			a: "Flisk's own apps, the developer tools and agent skills of the DevEx Roadmap with their live GitHub stars, and listings that people add with a pull request.",
		},
		{
			q: "How do I add my tool?",
			a: "Sign in with GitHub on the Publish page, fill in the form, and GitHub opens a pull request with your listing as one JSON file named after your login. When it is merged, it is in the store.",
		},
		{
			q: "What does signing in with GitHub allow?",
			a: "It tells this site your public GitHub login for one hour, in this browser tab only, through the same sign-in the DevEx Roadmap and Pages use. No token is kept and nothing is written to your account.",
		},
		{
			q: "Is there an API or an MCP server?",
			a: "Yes: /api/tools?q=docker searches the catalog as JSON, and /mcp is an MCP server with search_store and get_listing, for Claude, ChatGPT, Cursor or Codex. Neither needs a key.",
		},
	],
} as const;
