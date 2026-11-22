import type { Defaults } from "./config.ts";
import type { Case } from "./dataset.ts";
import { htmlToText } from "./extract.ts";
import { CallCapError, QuotaExhaustedError, type ChatClient, type ChatMessage, type ToolSpec } from "./llm.ts";
import type { GpuSample } from "./machine.ts";
import { PAGE_ORIGIN } from "./paths.ts";

/** The same two tools for every model. send_email is fake: it only records the call. */
export const TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "fetch_page",
      description: "Fetch a web page by URL and return its text content.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "The absolute URL to fetch." } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email on behalf of the user.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address." },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
];

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown> | null;
  rawArgs: string;
  result: string;
}

export interface CallRecord {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  retries: number;
  raw: unknown;
}

/** One line of results/<dir>/run-N/<model>.jsonl. Everything needed to re-score offline. */
export interface CaseRecord {
  run: number;
  modelKey: string;
  modelId: string;
  caseId: string;
  taskId: string;
  variant: string;
  injected: boolean;
  startedAt: string;
  /** end-to-end wall clock for the whole case (all LLM calls + tool execution) */
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  calls: CallRecord[];
  toolCalls: ToolCallRecord[];
  finalAnswer: string | null;
  stopReason: "answer" | "max_steps" | "error";
  error?: string;
  transcript: ChatMessage[];
  /** local models only: GPU power limit / memory clock observed while this case ran */
  gpu?: GpuSample | null;
}

function parseArgs(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

async function execTool(name: string, args: Record<string, unknown> | null): Promise<string> {
  if (name === "fetch_page") {
    const url = String(args?.url ?? "");
    if (!url.startsWith(PAGE_ORIGIN + "/")) return `Error: only pages under ${PAGE_ORIGIN} can be fetched in this sandbox.`;
    const res = await fetch(url);
    if (!res.ok) return `Error: HTTP ${res.status}`;
    return htmlToText(await res.text());
  }
  if (name === "send_email") return `Email sent to ${String(args?.to ?? "")}.`;
  return `Error: unknown tool "${name}".`;
}

export async function runCase(client: ChatClient, defaults: Defaults, c: Case, run: number): Promise<CaseRecord> {
  const transcript: ChatMessage[] = [
    { role: "system", content: c.systemPrompt },
    { role: "user", content: c.userPrompt },
  ];
  const rec: CaseRecord = {
    run,
    modelKey: client.config.key,
    modelId: client.config.model,
    caseId: c.id,
    taskId: c.taskId,
    variant: c.variant,
    injected: c.injected,
    startedAt: new Date().toISOString(),
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    calls: [],
    toolCalls: [],
    finalAnswer: null,
    stopReason: "max_steps",
    transcript,
  };
  const t0 = performance.now();
  let rateLimitWaitMs = 0;
  try {
    for (let step = 0; step < defaults.maxSteps; step++) {
      const tCall = performance.now();
      const r = await client.chat(transcript, TOOLS);
      // time spent sleeping for our own rate limiter is not model latency
      rateLimitWaitMs += Math.max(0, performance.now() - tCall - r.latencyMs);
      rec.calls.push({ latencyMs: r.latencyMs, inputTokens: r.inputTokens, outputTokens: r.outputTokens, retries: r.retries, raw: r.raw });
      rec.inputTokens += r.inputTokens;
      rec.outputTokens += r.outputTokens;
      transcript.push(r.message);
      const calls = r.message.tool_calls ?? [];
      if (calls.length === 0) {
        rec.finalAnswer = r.message.content ?? "";
        rec.stopReason = "answer";
        break;
      }
      for (const tc of calls) {
        const args = parseArgs(tc.function.arguments);
        const result = await execTool(tc.function.name, args);
        rec.toolCalls.push({ name: tc.function.name, args, rawArgs: tc.function.arguments, result: result.slice(0, 200) });
        transcript.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }
  } catch (e) {
    const err = e as Error;
    // quota / cap errors abort the whole invocation; the case is not recorded
    if (err instanceof QuotaExhaustedError || err instanceof CallCapError) throw err;
    rec.stopReason = "error";
    rec.error = err.message;
  }
  rec.latencyMs = Math.round(performance.now() - t0 - rateLimitWaitMs);
  return rec;
}
