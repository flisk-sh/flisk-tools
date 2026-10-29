// Stack Scanner: the pieces of an app, read from a repository's file tree.
import { headers, REPO } from "../repo-stats/main.ts";

const KINDS: [string, RegExp][] = [
	["Dockerfile", /(^|\/)Dockerfile(\.[\w.-]+)?$/],
	["Compose", /(^|\/)(docker-)?compose(\.[\w-]+)?\.ya?ml$/],
	["Procfile", /(^|\/)Procfile$/],
	["render.yaml", /(^|\/)render\.yaml$/],
	["Flisk service", /(^|\/)service\.json$/],
	["package.json", /(^|\/)package\.json$/],
	["go.mod", /(^|\/)go\.mod$/],
	["pyproject", /(^|\/)(pyproject\.toml|requirements\.txt)$/],
];

/** Which known stack files a list of paths holds. node_modules and vendored folders are skipped. */
export function detect(paths: string[]): { kind: string; path: string }[] {
	const found: { kind: string; path: string }[] = [];
	for (const path of paths) {
		if (/(^|\/)(node_modules|vendor|\.git)\//.test(path)) continue;
		const kind = KINDS.find(([, re]) => re.test(path))?.[0];
		if (kind) found.push({ kind, path });
	}
	return found;
}

/** A service is a folder that holds a Dockerfile, a service.json or a package.json of its own. */
export function services(found: { kind: string; path: string }[]): string[] {
	const dirs = new Set<string>();
	for (const f of found) {
		if (!["Dockerfile", "Flisk service", "package.json"].includes(f.kind)) continue;
		const i = f.path.lastIndexOf("/");
		dirs.add(i < 0 ? "." : f.path.slice(0, i));
	}
	return [...dirs].sort();
}

export default async function main(input: Record<string, string>) {
	const repo = String(input.repo ?? "").trim();
	if (!REPO.test(repo)) throw new Error("repo must look like owner/name.");
	const res = await fetch(
		`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
		{ headers: headers() },
	);
	if (!res.ok) throw new Error(`GitHub answered ${res.status} for the file tree.`);
	const tree = (await res.json()) as {
		tree: { path: string; type: string }[];
		truncated: boolean;
	};
	const paths = tree.tree.filter((n) => n.type === "blob").map((n) => n.path);
	const found = detect(paths);
	return {
		repo,
		files: paths.length,
		truncated: tree.truncated,
		found: found.slice(0, 200),
		services: services(found),
	};
}
