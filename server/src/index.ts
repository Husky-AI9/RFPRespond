import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { validateEntraToken } from "./auth/entra.js";
import { parseRfp } from "./tools/parseRfp.js";
import { retrieveAnswer } from "./tools/retrieveAnswer.js";
import { findSme } from "./tools/findSme.js";
import { assignToSme } from "./tools/assignToSme.js";
import { compileResponse, AnswerItem } from "./tools/compileResponse.js";

const PORT = parseInt(process.env.PORT ?? "3978", 10);

// ── MCP Server (low-level API — avoids Zod generic depth issues) ─────────────

function createMcpServer(): Server {
  const server = new Server(
    { name: "rfp-respond", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "parseRfp",
        description: "Parse an RFP PDF from SharePoint into a structured list of questions.",
        inputSchema: {
          type: "object" as const,
          properties: {
            fileUrl: { type: "string", description: "SharePoint download URL for the RFP PDF" },
            accessToken: { type: "string", description: "Graph access token for file download" },
          },
          required: ["fileUrl", "accessToken"],
        },
      },
      {
        name: "retrieveAnswer",
        description: "Retrieve a grounded, cited answer for an RFP question via Foundry IQ. Returns confidence score — flag for SME review if below 0.6.",
        inputSchema: {
          type: "object" as const,
          properties: {
            question: { type: "string", description: "The RFP question to answer" },
            questionId: { type: "string", description: "Optional question ID for tracking" },
          },
          required: ["question"],
        },
      },
      {
        name: "findSme",
        description: "Find the best subject-matter expert for a topic using Work IQ people signals (Graph People API and document insights).",
        inputSchema: {
          type: "object" as const,
          properties: {
            topic: { type: "string", description: "Topic or keyword to find an expert for" },
            accessToken: { type: "string", description: "Graph access token (People.Read scope)" },
          },
          required: ["topic", "accessToken"],
        },
      },
      {
        name: "assignToSme",
        description: "Create a Microsoft Planner task assigning an RFP question to an SME for review.",
        inputSchema: {
          type: "object" as const,
          properties: {
            questionId: { type: "string", description: "RFP question identifier" },
            question: { type: "string", description: "Full text of the question" },
            userId: { type: "string", description: "Entra object ID of the SME" },
            planId: { type: "string", description: "Planner plan ID (falls back to PLANNER_PLAN_ID env var)" },
            accessToken: { type: "string", description: "Graph access token (Tasks.ReadWrite scope)" },
          },
          required: ["questionId", "question", "userId", "accessToken"],
        },
      },
      {
        name: "compileResponse",
        description: "Compile all drafted RFP answers into a formatted DOCX and upload to SharePoint.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rfpTitle: { type: "string", description: "Title of the RFP" },
            answers: {
              type: "array",
              description: "Array of drafted answers",
              items: {
                type: "object",
                properties: {
                  questionId: { type: "string" },
                  section: { type: "string" },
                  question: { type: "string" },
                  answer: { type: "string" },
                  citations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        excerpt: { type: "string" },
                      },
                    },
                  },
                  confidence: { type: "number" },
                  needsReview: { type: "boolean" },
                },
              },
            },
            sharePointSiteId: { type: "string", description: "SharePoint site ID" },
            accessToken: { type: "string", description: "Graph access token" },
          },
          required: ["rfpTitle", "answers", "sharePointSiteId", "accessToken"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) throw new McpError(ErrorCode.InvalidParams, "Missing arguments");

    try {
      switch (name) {
        case "parseRfp": {
          const result = await parseRfp(
            args["fileUrl"] as string,
            args["accessToken"] as string
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "retrieveAnswer": {
          const result = await retrieveAnswer(
            args["question"] as string,
            args["questionId"] as string | undefined
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "findSme": {
          const result = await findSme(
            args["topic"] as string,
            args["accessToken"] as string
          );
          return {
            content: [
              {
                type: "text",
                text: result
                  ? JSON.stringify(result, null, 2)
                  : "No subject-matter expert found for this topic.",
              },
            ],
          };
        }

        case "assignToSme": {
          const result = await assignToSme(
            args["questionId"] as string,
            args["question"] as string,
            args["userId"] as string,
            args["accessToken"] as string,
            args["planId"] as string | undefined
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "compileResponse": {
          const result = await compileResponse(
            args["rfpTitle"] as string,
            args["answers"] as AnswerItem[],
            args["sharePointSiteId"] as string,
            args["accessToken"] as string
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (err) {
      if (err instanceof McpError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, message);
    }
  });

  return server;
}

// ── Express HTTP layer ───────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Auth can be turned off for demo/dev via DISABLE_AUTH=true. When off, /mcp is
// publicly accessible with no token — do NOT use this in production.
const AUTH_DISABLED = process.env.DISABLE_AUTH === "true";
const requireAuth: express.RequestHandler = AUTH_DISABLED
  ? (_req, _res, next) => next()
  : validateEntraToken;
if (AUTH_DISABLED) console.warn("⚠️  DISABLE_AUTH=true — /mcp is UNAUTHENTICATED");

// Health check (unauthenticated — needed by ACA liveness probes)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// Session store: maps an MCP session id to its live transport so the
// initialize handshake and subsequent tool calls share one server instance.
const transports: Record<string, StreamableHTTPServerTransport> = {};

// MCP endpoint — POST with Entra Bearer token required
app.post("/mcp", requireAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Existing session — reuse its transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session — create a transport and register it once initialized
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };
    const server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET (SSE stream) and DELETE (session teardown) reuse the existing session
async function handleSessionRequest(req: express.Request, res: express.Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
}

app.get("/mcp", requireAuth, handleSessionRequest);
app.delete("/mcp", requireAuth, handleSessionRequest);

app.listen(PORT, () => {
  console.log(`RFPRespond MCP server listening on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  MCP:    http://localhost:${PORT}/mcp`);
});
