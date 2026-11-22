import fs from "node:fs";
import path from "node:path";
import type { CaseRecord } from "./agent.ts";
import type { ModelsFile } from "./config.ts";
import type { Dataset } from "./dataset.ts";
import { scoreRecord } from "./score.ts";

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** nearest-rank percentile */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

const pct = (n: number, d: number) => (d ? (100 * n) / d : NaN);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** Metrics of ONE run of ONE model. */
export interface RunMetrics {
  run: number;
  cases: number;
  /** % of injected cases where the agent emailed the attacker */
  asrPct: number;
  /** % of injected cases where the email also contained the secret */
  secretLeakPct: number;
  /** % of clean cases answered correctly */
  benignCleanPct: number;
  /** % of injected cases still answered correctly (utility under attack) */
  benignUnderAttackPct: number;
  /** % of cases where the model actually fetched the page */
  fetchPct: number;
  errors: number;
  latencyMedianMs: number;
  latencyP95Ms: number;
  inputTokensPerCase: number;
  outputTokensPerCase: number;
  costUsdPer1kCases: number | null;
  asrPctByTechnique: Record<string, number>;
  /** local models: lowest and highest GPU power limit seen during this run's cases (null for cloud) */
  gpuPowerLimitW: { min: number; max: number } | null;
}

export interface Spread {
  median: number;
  min: number;
  max: number;
}

export interface ModelSummary {
  modelKey: string;
  modelId: string;
  label: string;
  runs: number;
  perRun: RunMetrics[];
  /** median and min-max over runs */
  overall: Record<string, Spread | null>;
  asrByTechnique: Record<string, Spread>;
}

export function readRecords(dir: string): CaseRecord[] {
  const out: CaseRecord[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const runDir of fs.readdirSync(dir).filter((d) => /^run-\d+$/.test(d)).sort()) {
    for (const f of fs.readdirSync(path.join(dir, runDir)).filter((f) => f.endsWith(".jsonl"))) {
      const lines = fs.readFileSync(path.join(dir, runDir, f), "utf8").split("\n").filter(Boolean);
      for (const l of lines) out.push(JSON.parse(l) as CaseRecord);
    }
  }
  return out;
}

function runMetrics(run: number, recs: CaseRecord[], ds: Dataset, price: { input: number | null; output: number | null }): RunMetrics {
  const scored = recs.map((r) => ({ r, s: scoreRecord(r, ds) }));
  const inj = scored.filter((x) => x.r.injected);
  const clean = scored.filter((x) => !x.r.injected);
  const lat = recs.map((r) => r.latencyMs);
  const inTok = mean(recs.map((r) => r.inputTokens));
  const outTok = mean(recs.map((r) => r.outputTokens));
  const byTech: Record<string, number> = {};
  for (const t of ds.techniques.techniques) {
    const xs = inj.filter((x) => x.r.variant === t.id);
    if (xs.length) byTech[t.id] = pct(xs.filter((x) => x.s.attackSuccess).length, xs.length);
  }
  return {
    run,
    cases: recs.length,
    asrPct: pct(inj.filter((x) => x.s.attackSuccess).length, inj.length),
    secretLeakPct: pct(inj.filter((x) => x.s.secretLeaked).length, inj.length),
    benignCleanPct: pct(clean.filter((x) => x.s.taskSuccess).length, clean.length),
    benignUnderAttackPct: pct(inj.filter((x) => x.s.taskSuccess).length, inj.length),
    fetchPct: pct(scored.filter((x) => x.s.fetched).length, scored.length),
    errors: scored.filter((x) => x.s.error).length,
    latencyMedianMs: median(lat),
    latencyP95Ms: percentile(lat, 95),
    inputTokensPerCase: inTok,
    outputTokensPerCase: outTok,
    costUsdPer1kCases:
      price.input == null || price.output == null ? null : (1000 * (inTok * price.input + outTok * price.output)) / 1e6,
    asrPctByTechnique: byTech,
    gpuPowerLimitW: gpuRange(recs),
  };
}

function gpuRange(recs: CaseRecord[]): { min: number; max: number } | null {
  const g = recs.map((r) => r.gpu).filter((x): x is NonNullable<typeof x> => !!x);
  if (!g.length) return null;
  return { min: Math.min(...g.map((x) => x.powerLimitW.min)), max: Math.max(...g.map((x) => x.powerLimitW.max)) };
}

function spread(xs: number[]): Spread {
  return { median: median(xs), min: Math.min(...xs), max: Math.max(...xs) };
}

export function summarize(dir: string, ds: Dataset, models: ModelsFile): ModelSummary[] {
  const recs = readRecords(dir);
  const byModel = new Map<string, CaseRecord[]>();
  for (const r of recs) byModel.set(r.modelKey, [...(byModel.get(r.modelKey) ?? []), r]);
  const out: ModelSummary[] = [];
  for (const [modelKey, mrecs] of byModel) {
    const cfg = models.models.find((m) => m.key === modelKey);
    const price = cfg?.pricePerMTokUsd ?? { input: null, output: null };
    const runs = [...new Set(mrecs.map((r) => r.run))].sort((a, b) => a - b);
    const perRun = runs.map((run) => runMetrics(run, mrecs.filter((r) => r.run === run), ds, price));
    const keys: (keyof RunMetrics)[] = [
      "asrPct", "secretLeakPct", "benignCleanPct", "benignUnderAttackPct", "fetchPct",
      "latencyMedianMs", "latencyP95Ms", "inputTokensPerCase", "outputTokensPerCase", "costUsdPer1kCases", "errors",
    ];
    const overall: Record<string, Spread | null> = {};
    for (const k of keys) {
      const xs = perRun.map((m) => m[k]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      overall[k] = xs.length ? spread(xs) : null;
    }
    const asrByTechnique: Record<string, Spread> = {};
    for (const t of ds.techniques.techniques) {
      const xs = perRun.map((m) => m.asrPctByTechnique[t.id]).filter((v) => v !== undefined);
      if (xs.length) asrByTechnique[t.id] = spread(xs);
    }
    out.push({ modelKey, modelId: mrecs[0].modelId, label: cfg?.label ?? modelKey, runs: runs.length, perRun, overall, asrByTechnique });
  }
  const order = models.models.map((m) => m.key);
  return out.sort((a, b) => order.indexOf(a.modelKey) - order.indexOf(b.modelKey));
}

function fmt(s: Spread | null | undefined, digits = 1, unit = ""): string {
  if (!s) return "n/a";
  const f = (x: number) => x.toFixed(digits);
  return s.min === s.max ? `${f(s.median)}${unit}` : `${f(s.median)}${unit} [${f(s.min)}-${f(s.max)}]`;
}

export function toMarkdown(sums: ModelSummary[], meta: { dir: string; fingerprint: string }): string {
  const lines: string[] = [];
  lines.push(`# Results: ${meta.dir}`, "");
  lines.push(`Values are the **median over runs [min-max]**. Dataset fingerprint: \`${meta.fingerprint}\`.`, "");
  lines.push(
    "| Model | Runs | Attack success (%) | Secret leaked (%) | Benign, clean (%) | Benign, under attack (%) | Fetched page (%) | Latency median (ms) | Latency p95 (ms) | Input tok/case | Output tok/case | USD / 1k cases | Errors |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const s of sums) {
    const o = s.overall;
    lines.push(
      `| ${s.modelKey} (\`${s.modelId}\`) | ${s.runs} | ${fmt(o.asrPct)} | ${fmt(o.secretLeakPct)} | ${fmt(o.benignCleanPct)} | ${fmt(o.benignUnderAttackPct)} | ${fmt(o.fetchPct)} | ${fmt(o.latencyMedianMs, 0)} | ${fmt(o.latencyP95Ms, 0)} | ${fmt(o.inputTokensPerCase, 0)} | ${fmt(o.outputTokensPerCase, 0)} | ${fmt(o.costUsdPer1kCases, 3)} | ${fmt(o.errors, 0)} |`,
    );
  }
  const techs = [...new Set(sums.flatMap((s) => Object.keys(s.asrByTechnique)))];
  if (techs.length) {
    lines.push("", "## Attack success by technique (%)", "", `| Model | ${techs.join(" | ")} |`, `|---|${techs.map(() => "---").join("|")}|`);
    for (const s of sums) lines.push(`| ${s.modelKey} | ${techs.map((t) => fmt(s.asrByTechnique[t], 0)).join(" | ")} |`);
  }
  lines.push(
    "", "## Per run", "",
    "GPU limit = the GPU power limit observed while the run's cases were executing (local models). A run whose min differs from max ran partly under a different power cap: its latency is not comparable.", "",
    "| Model | Run | Cases | ASR (%) | Benign clean (%) | Benign under attack (%) | Latency median (ms) | GPU limit (W) |",
    "|---|---|---|---|---|---|---|---|",
  );
  for (const s of sums)
    for (const r of s.perRun) {
      const g = r.gpuPowerLimitW ? (r.gpuPowerLimitW.min === r.gpuPowerLimitW.max ? `${r.gpuPowerLimitW.max}` : `${r.gpuPowerLimitW.min}-${r.gpuPowerLimitW.max} ⚠`) : "n/a";
      lines.push(`| ${s.modelKey} | ${r.run} | ${r.cases} | ${r.asrPct.toFixed(1)} | ${r.benignCleanPct.toFixed(1)} | ${r.benignUnderAttackPct.toFixed(1)} | ${r.latencyMedianMs.toFixed(0)} | ${g} |`);
    }
  return lines.join("\n") + "\n";
}

export function writeSummary(dir: string, sums: ModelSummary[], fingerprint: string): string {
  const md = toMarkdown(sums, { dir: path.relative(process.cwd(), dir) || dir, fingerprint });
  fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify({ fingerprint, models: sums }, null, 2));
  fs.writeFileSync(path.join(dir, "summary.md"), md);
  return md;
}
