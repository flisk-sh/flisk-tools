// Repo Stats: public numbers of one GitHub repository, through the GitHub API with the workflow's own token.
export const REPO = /^[\w.-]+\/[\w.-]+$/;

export function headers(): Record<string, string> {
	const token = process.env.GITHUB_TOKEN;
	return {
		accept: "application/vnd.github+json",
		"user-agent": "flisk-actors",
		...(token ? { authorization: `Bearer ${token}` } : {}),
	};
}

async function api<T>(path: string, missingOk = false): Promise<T | undefined> {
	const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
	if (res.status === 404 && missingOk) return undefined;
	if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}`);
	return (await res.json()) as T;
}

export default async function main(input: Record<string, string>) {
	const repo = String(input.repo ?? "").trim();
	if (!REPO.test(repo)) throw new Error("repo must look like owner/name.");
	const info = await api<{
		stargazers_count: number;
		forks_count: number;
		open_issues_count: number;
		license: { spdx_id: string } | null;
		pushed_at: string;
	}>(`/repos/${repo}`);
	if (!info) throw new Error("Repository not found.");
	const languages = await api<Record<string, number>>(`/repos/${repo}/languages`);
	const release = await api<{ tag_name: string; published_at: string }>(
		`/repos/${repo}/releases/latest`,
		true,
	);
	return {
		repo,
		stars: info.stargazers_count,
		forks: info.forks_count,
		openIssues: info.open_issues_count,
		license: info.license?.spdx_id ?? null,
		languages: languages ?? {},
		pushedAt: info.pushed_at,
		latestRelease: release
			? { tag: release.tag_name, publishedAt: release.published_at }
			: null,
	};
}
