// The Actor catalog. An Actor is a script in actors/<id>/main.ts at the repository root; the one workflow
// .github/workflows/run-actor.yml runs it in the signed-in person's own fork, on their own free Actions minutes,
// and publishes the result to that fork's `results` branch. This site holds no data and runs no Actor itself.

export interface ActorInput {
	name: string;
	label: string;
	placeholder: string;
	required: boolean;
}

export interface Actor {
	id: string;
	name: string;
	tagline: string;
	description: string;
	category: string;
	inputs: ActorInput[];
	/** What the result JSON holds, for the Actor page and the API. */
	output: string;
	/** Example input, shown on the Actor page and used by the "Try it" link. */
	example: Record<string, string>;
}

/** Where Actors run: this repository's workflow, copied into each person's fork. */
export const RUNNER = {
	workflow: "run-actor.yml",
	branch: "results",
	ref: "main",
} as const;

export const ACTORS: Actor[] = [
	{
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
];

export const CATEGORIES = [...new Set(ACTORS.map((a) => a.category))];

export const findActor = (id: string) => ACTORS.find((a) => a.id === id);

/** The same text for the MCP tool and llms.txt. */
export function describeActor(a: Actor): string {
	return `${a.name} (${a.id}): ${a.tagline}. ${a.description} Input: ${a.inputs
		.map((i) => `${i.name}${i.required ? "" : "?"}`)
		.join(", ")}. Output: ${a.output}`;
}
