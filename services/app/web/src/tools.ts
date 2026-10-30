// The Tool catalog. A tool is a script in tools/<id>/main.ts at the repository root; the one workflow
// .github/workflows/run-tool.yml runs it in the signed-in person's own fork, on their own free Actions minutes,
// and publishes the result to that fork's `results` branch. This site holds no data and runs no Tool itself.

export interface ToolInput {
	name: string;
	label: string;
	placeholder: string;
	required: boolean;
}

export interface Tool {
	/** "run" tools run in the visitor's GitHub through the console; "link" tools are Flisk's own apps, opened where they live. */
	kind: "run" | "link";
	/** For "link" tools: where it lives. */
	url?: string;
	id: string;
	name: string;
	tagline: string;
	description: string;
	category: string;
	inputs: ToolInput[];
	/** What the result JSON holds, for the Tool page and the API. */
	output: string;
	/** Example input, shown on the Tool page and used by the "Try it" link. */
	example: Record<string, string>;
}

/** Where Tools run: this repository's workflow, copied into each person's fork. */
export const RUNNER = {
	workflow: "run-tool.yml",
	branch: "results",
	ref: "main",
} as const;

export const TOOLS: Tool[] = [
	{
		kind: "run",
		id: "repo-stats",
		name: "Repo Stats",
		tagline:
			"Stars, forks, languages and the latest release of a GitHub repository",
		description:
			"Reads one public GitHub repository through the GitHub API and returns its stars, forks, open issues, license, languages by size, last push and latest release as JSON.",
		category: "GitHub",
		inputs: [
			{
				name: "repo",
				label: "Repository",
				placeholder: "flisk-sh/flisk",
				required: true,
			},
		],
		output:
			"{ repo, stars, forks, openIssues, license, languages, pushedAt, latestRelease }",
		example: { repo: "flisk-sh/flisk" },
	},
	{
		kind: "run",
		id: "stack-scanner",
		name: "Stack Scanner",
		tagline:
			"Every service, Dockerfile and Compose file in a GitHub repository",
		description:
			"Lists the pieces of an app from its file tree: Dockerfiles, Compose files, Procfiles, render.yaml, service.json and package.json files, each with its folder, so you see the whole stack from one link.",
		category: "Developer tools",
		inputs: [
			{
				name: "repo",
				label: "Repository",
				placeholder: "flisk-sh/flisk-example",
				required: true,
			},
		],
		output:
			"{ repo, files: number, found: { kind, path }[], services: string[] }",
		example: { repo: "flisk-sh/flisk-example" },
	},
	{
		kind: "run",
		id: "link-checker",
		name: "Link Checker",
		tagline: "Find the broken links on one web page",
		description:
			"Fetches one public page, follows each link once with a short timeout and returns the status of every link, so the broken ones are easy to spot. One page only, no crawling.",
		category: "Web",
		inputs: [
			{
				name: "url",
				label: "Page address",
				placeholder: "https://flisk.sh",
				required: true,
			},
		],
		output: "{ url, checked, broken: { url, status }[] }",
		example: { url: "https://flisk.sh" },
	},
	{
		kind: "link",
		url: "https://readme.flisk.si",
		id: "readme-score",
		name: "README Score",
		tagline: "Your README, scored out of 100, with a fix for every miss",
		description:
			"Enter a GitHub repository or paste a README and get a score out of 100, the sections found and missing, and a fix for each miss.",
		category: "Flisk apps",
		inputs: [],
		output: "A web page with the score and the fixes",
		example: {},
	},
	{
		kind: "link",
		url: "https://citable.flisk.si",
		id: "citable",
		name: "Citable",
		tagline:
			"Can AI answers cite your site? Put citable.flisk.si/ in front of any address",
		description:
			"Reads a page the way ChatGPT search, Claude and Perplexity crawlers do, scores it out of 100 and says what keeps it out of their answers, with the fix.",
		category: "Flisk apps",
		inputs: [],
		output: "A web page with the score and the fixes",
		example: {},
	},
	{
		kind: "link",
		url: "https://helpdock.flisk.sh",
		id: "helpdock",
		name: "Helpdock",
		tagline: "Any GitHub repo's docs, as a help center and an MCP server",
		description:
			"Replace github.com with helpdock.flisk.sh in a repository address to browse its docs, get answers quoted from the exact page, and add the docs to your AI over MCP.",
		category: "Flisk apps",
		inputs: [],
		output: "A help center page and an MCP server per repository",
		example: {},
	},
	{
		kind: "link",
		url: "https://cmd.flisk.sh",
		id: "command-comparer",
		name: "Command Comparer",
		tagline:
			"Flisk next to Terraform, Docker Compose, Tilt and more, command by command",
		description:
			"Commands side by side across many tabs, with a source link for every cell.",
		category: "Flisk apps",
		inputs: [],
		output: "A comparison page",
		example: {},
	},
	{
		kind: "link",
		url: "https://pages.flisk.si",
		id: "pages",
		name: "Pages",
		tagline: "Your agent builds a page. One command makes it a link",
		description:
			"Publish an interactive page to pages.flisk.si/@your-login/name. Free and public, no keys, no database: every page is a git branch.",
		category: "Flisk apps",
		inputs: [],
		output: "A public link to your page",
		example: {},
	},
	{
		kind: "link",
		url: "https://roadmap.flisk.si",
		id: "devex-roadmap",
		name: "DevEx Roadmap",
		tagline:
			"A community-edited map of developer tools, roles and agent skills",
		description:
			"Compass, Adoption Radar, Lab, Journeys, Roles, Skills, Portfolio and Ask: hundreds of tools and 400 agent skills, drawn eight ways.",
		category: "Flisk apps",
		inputs: [],
		output: "A set of interactive maps",
		example: {},
	},
	{
		kind: "link",
		url: "https://demo.flisk.sh",
		id: "flisk-demos",
		name: "Flisk Demos",
		tagline: "A personalised Flisk demo for what you build",
		description:
			"Open demo.flisk.sh/your-handle/what-you-build-in-dashes and get a demo stack made for you.",
		category: "Flisk apps",
		inputs: [],
		output: "A generated demo stack",
		example: {},
	},
	{
		kind: "link",
		url: "https://github.com/flisk-sh/fliskos",
		id: "fliskos",
		name: "FliskOS",
		tagline: "One local window for your Flisk projects, agents and apps",
		description:
			"Projects and their health, coding agents working on them, and the other Flisk apps. Runs on your machine and holds no keys.",
		category: "Flisk apps",
		inputs: [],
		output: "A desktop app",
		example: {},
	},
	{
		kind: "link",
		url: "https://github.com/flisk-sh/flisk-import",
		id: "flisk-import",
		name: "Flisk Import",
		tagline: "Turn a Docker Compose file into Flisk services",
		description:
			"Imports the services in a repository's docker-compose.yml into Flisk as service.json files. Use --dry-run to see the plan first.",
		category: "Flisk apps",
		inputs: [],
		output: "service.json files",
		example: {},
	},
	{
		kind: "link",
		url: "https://github.com/flisk-sh/md2html",
		id: "md2html",
		name: "md2html",
		tagline: "GitHub-flavored Markdown to HTML that is safe to put in a page",
		description:
			"A configured markdown-it and sanitize-html: tables, task lists, alerts and the HTML that READMEs carry, rendered the way GitHub renders a README.",
		category: "Flisk apps",
		inputs: [],
		output: "An npm library",
		example: {},
	},
	{
		kind: "link",
		url: "https://github.com/flisk-sh/flisk-service-definitions",
		id: "service-definitions",
		name: "Service Definitions",
		tagline: "A community registry of Flisk apps, one service.json per app",
		description:
			"Apps imported with flisk-import and validated against the Flisk service schema, the way DefinitelyTyped publishes types.",
		category: "Flisk apps",
		inputs: [],
		output: "A registry of service.json files",
		example: {},
	},
];

export const CATEGORIES = [...new Set(TOOLS.map((a) => a.category))];

/** The tools the console can run. */
export const RUNNABLE = TOOLS.filter((a) => a.kind === "run");

export const findTool = (id: string) => TOOLS.find((a) => a.id === id);

/** The same text for the MCP tool and llms.txt. */
export function describeTool(a: Tool): string {
	const where =
		a.kind === "link"
			? `Open it at ${a.url}.`
			: `Input: ${a.inputs.map((i) => `${i.name}${i.required ? "" : "?"}`).join(", ")}.`;
	return `${a.name} (${a.id}): ${a.tagline}. ${a.description} ${where} Output: ${a.output}`;
}
