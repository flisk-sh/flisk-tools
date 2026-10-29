// Link Checker: the links of one page, each asked once. Runs on a GitHub-hosted runner, so it only reaches the public web.
const MAX_LINKS = 100;

/** Absolute http(s) links of an HTML page, without fragments, in order and without repeats. */
export function links(html: string, base: string): string[] {
	const out = new Set<string>();
	for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
		try {
			const u = new URL(m[1], base);
			if (u.protocol !== "http:" && u.protocol !== "https:") continue;
			u.hash = "";
			out.add(u.href);
		} catch {
			// a malformed href is not a link to check
		}
	}
	return [...out];
}

async function status(url: string): Promise<number> {
	try {
		const res = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
			signal: AbortSignal.timeout(10_000),
			headers: { "user-agent": "flisk-runs link-checker" },
		});
		// Some servers refuse HEAD; ask once more with GET before calling the link broken.
		if (res.status === 405 || res.status === 403) {
			return (
				await fetch(url, {
					redirect: "follow",
					signal: AbortSignal.timeout(10_000),
					headers: { "user-agent": "flisk-runs link-checker" },
				})
			).status;
		}
		return res.status;
	} catch {
		return 0;
	}
}

export default async function main(input: Record<string, string>) {
	const url = String(input.url ?? "").trim();
	if (!/^https?:\/\//.test(url)) throw new Error("url must start with http:// or https://.");
	const page = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!page.ok) throw new Error(`The page answered ${page.status}.`);
	const all = links(await page.text(), page.url).slice(0, MAX_LINKS);
	const results: { url: string; status: number }[] = [];
	for (let i = 0; i < all.length; i += 10) {
		const batch = all.slice(i, i + 10);
		const codes = await Promise.all(batch.map(status));
		batch.forEach((u, j) => results.push({ url: u, status: codes[j] }));
	}
	return {
		url,
		checked: results.length,
		broken: results.filter((r) => r.status === 0 || r.status >= 400),
	};
}
