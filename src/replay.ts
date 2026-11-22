/**
 * npm run replay [-- results/final]
 * Recomputes every number from the raw records saved in results/. No model, GPU, API key or network needed.
 */
import fs from "node:fs";
import path from "node:path";
import { loadModels } from "./config.ts";
import { datasetFingerprint, loadDataset } from "./dataset.ts";
import { RESULTS_DIR, ROOT } from "./paths.ts";
import { summarize, writeSummary } from "./summarize.ts";

function defaultDir(): string {
  const final = path.join(RESULTS_DIR, "final");
  if (fs.existsSync(final)) return final;
  const dirs = fs.existsSync(RESULTS_DIR)
    ? fs.readdirSync(RESULTS_DIR).filter((d) => fs.statSync(path.join(RESULTS_DIR, d)).isDirectory()).sort()
    : [];
  if (!dirs.length) throw new Error("No results folder found. Run `npm run measure` first.");
  return path.join(RESULTS_DIR, dirs[dirs.length - 1]);
}

const dir = path.resolve(ROOT, process.argv[2] ?? defaultDir());
const ds = loadDataset();
const fp = datasetFingerprint(ds);
const metaPath = path.join(dir, "meta.json");
if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  if (meta.fingerprint && meta.fingerprint !== fp) {
    console.warn(`! dataset fingerprint differs from the one recorded (${meta.fingerprint} vs ${fp}): data/ changed after these runs.`);
  }
}
console.log(`Replaying ${path.relative(ROOT, dir)} (no model calls)\n`);
console.log(writeSummary(dir, summarize(dir, ds, loadModels()), fp));
