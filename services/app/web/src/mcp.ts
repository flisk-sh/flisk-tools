// A read-only MCP server over Streamable HTTP. Stateless and answered with plain JSON (no event stream), which the
// transport allows, so there is no session to keep. Add tools to MCP_TOOLS; each one gets its arguments and returns text.

import { SITE } from "./site";
import { describeTool, findTool, TOOLS } from "./tools";

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
			name: "list_tools",
			title: "List Tools",
			description:
				"Every Tool in the store: its id, what it does and what input it takes. Tools run in the person's own GitHub Actions through the console, so this server only reads the catalog.",
			inputSchema: { type: "object", properties: {} },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async run() {
			return TOOLS.map(describeTool).join("\n\n");
		},
	},
	{
		definition: {
			name: "get_tool",
			title: "Get one Tool",
			description:
				"One Tool with its input fields, its output shape and an example input.",
			inputSchema: {
				type: "object",
				properties: {
					id: { type: "string", description: "The Tool id, like repo-stats" },
				},
				required: ["id"],
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async run(args) {
			const a = findTool(String(args.id ?? ""));
			return a
				? `${describeTool(a)}\nExample input: ${JSON.stringify(a.example)}`
				: { error: `No Tool with id ${String(args.id)}. Use list_tools.` };
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
