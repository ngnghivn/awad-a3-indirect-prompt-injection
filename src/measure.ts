/**
 * npm run measure [-- options]
 *
 *   --models cloud,local-small,local-mid   which models (keys in config/models.json). Default: all except mock
 *   --runs 5                               how many runs
 *   --start 1                              number of the first run (to continue on another day: --start 4 --runs 2)
 *   --out results/final                    output folder (default: results/dev-<timestamp>)
 *   --tasks t01,t02                        only these tasks (for quick checks)
 *
 * Re-running into an existing --out folder resumes: cases already recorded are skipped.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { runCase, type CaseRecord } from "./agent.ts";
import { loadModels } from "./config.ts";
import { datasetFingerprint, loadDataset } from "./dataset.ts";
import { CallCapError, makeClient, preflight, QuotaExhaustedError } from "./llm.ts";
import { machineInfo, startGpuSampler } from "./machine.ts";
import { loadDotEnv, RESULTS_DIR, ROOT } from "./paths.ts";
import { startPageServer } from "./server.ts";
import { summarize, writeSummary } from "./summarize.ts";

loadDotEnv();
const { values } = parseArgs({
  options: {
    models: { type: "string" },
    runs: { type: "string", default: "5" },
    start: { type: "string", default: "1" },
    out: { type: "string" },
    tasks: { type: "string" },
  },
});

const modelsFile = loadModels();
const ds = loadDataset({ taskIds: values.tasks?.split(",") });
const fingerprint = datasetFingerprint(ds);
const runs = Number(values.runs);
const start = Number(values.start);
const outDir = path.resolve(ROOT, values.out ?? path.join("results", `dev-${new Date().toISOString().replace(/[:.]/g, "-")}`));
fs.mkdirSync(outDir, { recursive: true });

const wanted = values.models ? values.models.split(",") : modelsFile.models.filter((m) => m.kind !== "mock").map((m) => m.key);
const selected = [];
for (const key of wanted) {
  const cfg = modelsFile.models.find((m) => m.key === key);
  if (!cfg) throw new Error(`unknown model key "${key}" (see config/models.json)`);
  const why = await preflight(cfg);
  if (why) console.warn(`! skipping ${key}: ${why}`);
  else selected.push(cfg);
}
if (!selected.length) {
  console.error("No model is available. To recompute the reported numbers without any model or key, run: npm run replay");
  process.exit(1);
}

// meta.json: what was held fixed + every invocation
const metaPath = path.join(outDir, "meta.json");
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : { invocations: [] };
if (meta.fingerprint && meta.fingerprint !== fingerprint && !values.tasks) {
  console.error(`Dataset changed since this folder was started (fingerprint ${meta.fingerprint} -> ${fingerprint}). Use a new --out.`);
  process.exit(1);
}
meta.fingerprint ??= fingerprint;
meta.defaults = modelsFile.defaults;
meta.invocations.push({
  at: new Date().toISOString(),
  argv: process.argv.slice(2),
  machine: machineInfo(),
  models: selected.map((m) => ({ key: m.key, model: m.model, baseUrl: m.baseUrl ?? null })),
  tasks: ds.tasks.map((t) => t.id),
});
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

console.log(`Cases per run: ${ds.cases.length} (${ds.tasks.length} tasks x ${1 + ds.techniques.techniques.length} variants)`);
console.log(`Models: ${selected.map((m) => m.key).join(", ")} | runs ${start}..${start + runs - 1} | out: ${path.relative(ROOT, outDir)}`);

const server = await startPageServer(ds);
let aborted: string | null = null;
try {
  outer: for (let run = start; run < start + runs; run++) {
    const runDir = path.join(outDir, `run-${run}`);
    fs.mkdirSync(runDir, { recursive: true });
    for (const cfg of selected) {
      const client = makeClient(cfg, modelsFile.defaults);
      const file = path.join(runDir, `${cfg.key}.jsonl`);
      const done = new Set(
        fs.existsSync(file)
          ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => (JSON.parse(l) as CaseRecord).caseId)
          : [],
      );
      const todo = ds.cases.filter((c) => !done.has(c.id));
      if (!todo.length) {
        console.log(`run ${run} ${cfg.key}: already complete, skipped`);
        continue;
      }
      if (cfg.warmup) {
        // load the local model into GPU memory so the first case does not pay the cold start
        process.stdout.write(`run ${run} ${cfg.key}: warm-up... `);
        await client.chat([{ role: "user", content: "Reply with OK." }], []);
        console.log("ok");
      }
      for (const [i, c] of todo.entries()) {
        let rec: CaseRecord;
        const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(cfg.baseUrl ?? "");
        const stopGpu = isLocal ? startGpuSampler() : null;
        try {
          rec = await runCase(client, modelsFile.defaults, c, run);
          if (stopGpu) rec.gpu = await stopGpu();
        } catch (e) {
          await stopGpu?.();
          if (e instanceof QuotaExhaustedError || e instanceof CallCapError) {
            aborted = e.message;
            break outer;
          }
          throw e;
        }
        fs.appendFileSync(file, JSON.stringify(rec) + "\n");
        const emailed = rec.toolCalls.some((t) => t.name === "send_email");
        console.log(
          `run ${run} ${cfg.key} [${done.size + i + 1}/${ds.cases.length}] ${c.id.padEnd(22)} ${String(rec.latencyMs).padStart(6)} ms ${rec.stopReason}${rec.gpu ? `  GPU ${rec.gpu.powerLimitW.min}-${rec.gpu.powerLimitW.max} W` : ""}${emailed ? "  <send_email>" : ""}${rec.error ? "  ERROR " + rec.error.slice(0, 80) : ""}`,
        );
      }
    }
  }
} finally {
  server.close();
}

const sums = summarize(outDir, ds, modelsFile);
console.log("\n" + writeSummary(outDir, sums, fingerprint));
if (aborted) {
  console.error(`\nSTOPPED EARLY: ${aborted}\nEverything recorded so far is saved. Re-run the same command later (e.g. after the quota resets) to resume.`);
  process.exit(2);
}
