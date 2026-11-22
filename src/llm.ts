import type { Defaults, ModelConfig } from "./config.ts";

/** OpenAI chat-completions message shape. Assistant messages are kept exactly as the API returned them
 *  (some providers, e.g. Gemini 3 function calling, need extra fields echoed back). */
export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  [extra: string]: unknown;
};

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  [extra: string]: unknown;
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatResult {
  message: ChatMessage;
  inputTokens: number;
  outputTokens: number;
  /** wall-clock time of the successful HTTP call */
  latencyMs: number;
  retries: number;
  raw: unknown;
}

export interface ChatClient {
  readonly config: ModelConfig;
  chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatResult>;
  callsMade(): number;
}

export class QuotaExhaustedError extends Error {}
export class CallCapError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OpenAICompatClient implements ChatClient {
  private lastCallAt = 0;
  private calls = 0;
  constructor(
    readonly config: ModelConfig,
    private defaults: Defaults,
    private apiKey: string | undefined,
  ) {}

  callsMade() {
    return this.calls;
  }

  async chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatResult> {
    const body = {
      model: this.config.model,
      messages,
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
      temperature: this.defaults.temperature,
      max_tokens: this.defaults.maxTokens,
      ...(this.config.extraBody ?? {}),
    };
    let retries = 0;
    for (;;) {
      if (this.calls >= this.config.maxCallsPerInvocation) {
        throw new CallCapError(
          `${this.config.key}: reached maxCallsPerInvocation=${this.config.maxCallsPerInvocation} (spending/quota cap in config/models.json)`,
        );
      }
      const wait = this.lastCallAt + this.config.minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastCallAt = Date.now();
      this.calls++;

      const t0 = performance.now();
      let res: Response;
      try {
        res = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180_000),
        });
      } catch (e) {
        if (retries++ < 3) {
          await sleep(5000 * retries);
          continue;
        }
        throw e;
      }
      const latencyMs = performance.now() - t0;
      const text = await res.text();

      if (res.status === 429 || res.status >= 500) {
        if (res.status === 429 && /per.?day|PerDay|daily/i.test(text)) {
          throw new QuotaExhaustedError(`${this.config.key}: daily quota exhausted. ${text.slice(0, 300)}`);
        }
        if (retries++ < 6) {
          await sleep(Math.min(60_000, 5000 * 2 ** (retries - 1)));
          continue;
        }
      }
      if (!res.ok) throw new Error(`${this.config.key}: HTTP ${res.status}: ${text.slice(0, 500)}`);

      const raw = JSON.parse(text);
      const msg = raw?.choices?.[0]?.message;
      if (!msg) throw new Error(`${this.config.key}: response has no choices[0].message: ${text.slice(0, 300)}`);
      return {
        message: normalizeAssistant(msg),
        inputTokens: raw.usage?.prompt_tokens ?? 0,
        outputTokens: raw.usage?.completion_tokens ?? 0,
        latencyMs,
        retries,
        raw,
      };
    }
  }
}

let idCounter = 0;
export function normalizeAssistant(msg: Record<string, unknown>): ChatMessage {
  const out: ChatMessage = { ...msg, role: "assistant", content: (msg.content as string | null) ?? null };
  const calls = msg.tool_calls as ToolCall[] | undefined;
  if (calls?.length) {
    out.tool_calls = calls.map((c) => ({
      ...c,
      id: c.id || `call_${++idCounter}`,
      type: "function",
      function: {
        name: c.function.name,
        arguments: typeof c.function.arguments === "string" ? c.function.arguments : JSON.stringify(c.function.arguments ?? {}),
      },
    }));
  } else {
    delete out.tool_calls;
  }
  return out;
}

/**
 * Deterministic fake model used ONLY to test the pipeline without a GPU or API key.
 * It always fetches the page, obeys any instruction to call send_email it finds, then answers
 * by quoting the page. Its numbers are meaningless and are never reported.
 */
export class MockClient implements ChatClient {
  private calls = 0;
  constructor(readonly config: ModelConfig) {}
  callsMade() {
    return this.calls;
  }
  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    this.calls++;
    const last = messages[messages.length - 1];
    const lastTool = [...messages].reverse().find((m) => m.role === "tool");
    const alreadyEmailed = messages.some((m) => m.tool_calls?.some((c) => c.function.name === "send_email"));
    let message: ChatMessage;
    if (last.role === "user") {
      const url = /(https?:\/\/\S+)/.exec(String(last.content))?.[1] ?? "";
      message = toolCallMsg("fetch_page", { url });
    } else if (last.role === "tool" && lastTool && !alreadyEmailed && /send_email/.test(String(lastTool.content))) {
      const to = /([\w.+-]+@[\w-]+\.test)/.exec(String(lastTool.content))?.[1] ?? "unknown@unknown.test";
      const notes = String(messages[0].content).split("\n").find((l) => l.includes("CANARY")) ?? "";
      message = toolCallMsg("send_email", { to, subject: "verification", body: notes });
    } else {
      const page = String(messages.find((m) => m.role === "tool")?.content ?? "");
      message = { role: "assistant", content: `From the page: ${page.slice(0, 1200)}` };
    }
    const inputTokens = Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = Math.round(JSON.stringify(message).length / 4);
    return { message, inputTokens, outputTokens, latencyMs: 1, retries: 0, raw: { mock: true, message } };
  }
}

function toolCallMsg(name: string, args: Record<string, unknown>): ChatMessage {
  return {
    role: "assistant",
    content: null,
    tool_calls: [{ id: `call_${++idCounter}`, type: "function", function: { name, arguments: JSON.stringify(args) } }],
  };
}

export function makeClient(cfg: ModelConfig, defaults: Defaults): ChatClient {
  if (cfg.kind === "mock") return new MockClient(cfg);
  const key = cfg.apiKeyEnv ? process.env[cfg.apiKeyEnv] : undefined;
  return new OpenAICompatClient(cfg, defaults, key);
}

/** Returns null if the model is usable, otherwise the reason it is skipped. */
export async function preflight(cfg: ModelConfig): Promise<string | null> {
  if (cfg.kind === "mock") return null;
  if (cfg.apiKeyEnv && !process.env[cfg.apiKeyEnv]) return `${cfg.apiKeyEnv} is not set (see .env.example)`;
  try {
    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: cfg.apiKeyEnv ? { authorization: `Bearer ${process.env[cfg.apiKeyEnv]}` } : {},
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return `GET ${cfg.baseUrl}/models returned HTTP ${res.status}`;
    const body = (await res.json()) as { data?: { id: string }[] };
    const ids = (body.data ?? []).map((m) => m.id.replace(/^models\//, ""));
    if (ids.length && !ids.includes(cfg.model) && !ids.includes(`${cfg.model}:latest`)) {
      return `model "${cfg.model}" not found at ${cfg.baseUrl} (run \`npm run list-models\`${cfg.apiKeyEnv ? "" : ` or \`ollama pull ${cfg.model}\``})`;
    }
    return null;
  } catch (e) {
    return `cannot reach ${cfg.baseUrl} (${(e as Error).message})${cfg.apiKeyEnv ? "" : " - is Ollama running?"}`;
  }
}
