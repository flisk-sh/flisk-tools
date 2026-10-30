# Listings

One file per listing, named `<your GitHub login>--<id>.json`. The easiest way to make one is the form at
<https://flisk-tools.onrender.com/publish> (sign in with GitHub): it opens a ready pull request.

```json
{
  "kind": "app",
  "id": "link-checker",
  "name": "Link Checker",
  "tagline": "Find the broken links on a page",
  "description": "Paste a page address and get every broken link on it, with its status.",
  "group": "Web",
  "category": "Quality",
  "url": "https://example.com",
  "repo": "you/link-checker"
}
```

If it has an MCP server, add one of these (the store then shows an MCP badge and the command to add it):

```json
"mcp": { "transport": "http", "url": "https://example.com/mcp", "tools": ["search"] }
"mcp": { "transport": "stdio", "command": "npx -y @you/your-mcp" }
```

`kind` is `app`, `tool` or `skill` (a skill needs `repo`). A check on the pull request confirms that the file name
starts with the author's login and that the catalog still builds. The author shown in the store comes from the file
name, never from the file.
