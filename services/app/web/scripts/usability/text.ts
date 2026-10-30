export {};

// Renders a page of the store as plain text for a tester who cannot see it: headings, paragraphs, and every link as
// `label [href]`. Usage: bun scripts/usability/text.ts "/?q=docker" [baseUrl] [maxChars]
const path = process.argv[2] ?? "/";
const base = process.argv[3] ?? "http://localhost:4880";
const max = Number(process.argv[4]) || 7000;
const res = await fetch(new URL(path, base));
let html = await res.text();
html = html
	.replace(/<(script|style|svg|head)[\s\S]*?<\/\1>/gi, "")
	.replace(
		/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
		(_m, href, inner) => `${inner.replace(/<[^>]+>/g, "")} [${href}]`,
	)
	.replace(
		/<\/(h[1-6]|p|li|tr|div|section|nav|header|footer|ul|ol|dt|dd|pre|figure)>/gi,
		"\n",
	)
	.replace(/<(br|hr)\s*\/?>/gi, "\n")
	.replace(/<input[^>]*placeholder="([^"]*)"[^>]*>/gi, "(search box: $1) ")
	.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, "(button: $1) ")
	.replace(/<[^>]+>/g, " ")
	.replace(/&amp;/g, "&")
	.replace(/&#39;/g, "'")
	.replace(/&quot;/g, '"')
	.replace(/&lt;/g, "<")
	.replace(/&gt;/g, ">")
	.replace(/[ \t]+/g, " ")
	.replace(/\n\s*\n+/g, "\n")
	.trim();
console.log(
	`HTTP ${res.status} ${path}\n${html.length > max ? `${html.slice(0, max)}\n… (${html.length - max} more characters)` : html}`,
);
