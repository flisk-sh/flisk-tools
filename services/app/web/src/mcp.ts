// A read-only MCP server over Streamable HTTP. Stateless and answered with plain JSON (no event stream), which the
// transport allows, so there is no session to keep. Add tools to MCP_TOOLS; each one gets its arguments and returns text.

import { describeEntry, findEntry, KINDS, search } from "./catalog";
import { SITE } from "./site";

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface McpTool {
	definition: {
		name: string;
		title: string;
		description: string;
		inputSchema: object;
		annotations: object;
	};
	/** The text to answer, or { error } for a tool error the model should see. */
	run(args: Record<string, unknown>): Promise<string | { error: string }>;
}

const MCP_TOOLS: McpTool[] = [
	{
		definition: {
			name: "search_store",
			title: "Search the store",
			description:
				"Search the catalog of developer tools, AI agent skills and apps. Words are matched against the name, tagline, group, category and author. Returns up to 24 results per page, official and most-starred first.",
			inputSchema: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Words to look for, like 'docker compose' or 'review'",
					},
					kind: {
						type: "string",
						enum: KINDS.map((k) => k.id),
						description: "Only this type",
					},
					page: { type: "number", description: "Page number, from 1" },
				},
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async run(args) {
			const r = search({
				q: String(args.query ?? ""),
				kind: args.kind ? String(args.kind) : undefined,
				page: Number(args.page) || 1,
			});
			return `${r.total} results, page ${r.page} of ${r.pages}\n\n${r.items.map(describeEntry).join("\n\n")}`;
		},
	},
	{
		definition: {
			name: "get_listing",
			title: "Get one listing",
			description:
				"One listing with its description, address, author and stars.",
			inputSchema: {
				type: "object",
				properties: {
					id: {
						type: "string",
						description: "The listing id, like readme-score",
					},
				},
				required: ["id"],
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async run(args) {
			const e = findEntry(String(args.id ?? ""));
			return e
				? describeEntry(e)
				: { error: `No listing with id ${String(args.id)}. Use search_store.` };
		},
	},
];

interface JsonRpcRequest {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
}

/** Answers one JSON-RPC message (or a batch); undefined when nothing is to be sent back (notifications). */
export async function handleMcp(body: unknown): Promise<unknown> {
	if (Array.isArray(body)) {
		const answers = (
			await Promise.all(body.map((m) => handleOne(m as JsonRpcRequest)))
		).filter((a) => a !== undefined);
		return answers.length ? answers : undefined;
	}
	return handleOne(body as JsonRpcRequest);
}

async function handleOne(message: JsonRpcRequest): Promise<unknown> {
	if (
		!message ||
		typeof message !== "object" ||
		typeof message.method !== "string"
	)
		return {
			jsonrpc: "2.0",
			id: message?.id ?? null,
			error: { code: -32600, message: "Invalid request" },
		};
	const { id, method, params = {} } = message;
	if (id === undefined || id === null) return undefined;
	const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
	switch (method) {
		case "initialize": {
			const asked = String(params.protocolVersion ?? "");
			return ok({
				protocolVersion: PROTOCOL_VERSIONS.includes(asked)
					? asked
					: PROTOCOL_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: {
					name: SITE.name.toLowerCase(),
					title: SITE.name,
					version: "1.0.0",
				},
				instructions: SITE.description,
			});
		}
		case "ping":
			return ok({});
		case "tools/list":
			return ok({ tools: MCP_TOOLS.map((t) => t.definition) });
		case "tools/call": {
			const tool = MCP_TOOLS.find((t) => t.definition.name === params.name);
			if (!tool)
				return {
					jsonrpc: "2.0",
					id,
					error: {
						code: -32602,
						message: `Unknown tool: ${String(params.name)}`,
					},
				};
			const out = await tool.run(
				(params.arguments as Record<string, unknown>) ?? {},
			);
			return typeof out === "string"
				? ok({ content: [{ type: "text", text: out }], isError: false })
				: ok({ content: [{ type: "text", text: out.error }], isError: true });
		}
		default:
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32601, message: `Method not found: ${method}` },
			};
	}
}
