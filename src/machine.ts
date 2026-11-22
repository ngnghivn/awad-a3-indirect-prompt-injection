import { execFile, execSync } from "node:child_process";
import os from "node:os";

/** GPU state seen while one case ran (local models only). Laptops change the GPU power limit on their
 *  own (we saw 20 W and 40 W on the same machine), so every case records what it actually got. */
export interface GpuSample {
  samples: number;
  powerLimitW: { min: number; max: number };
  memClockMHz: { min: number; max: number };
  utilMaxPct: number;
}

function querySmi(): Promise<number[] | null> {
  return new Promise((resolve) => {
    execFile(
      "nvidia-smi",
      ["--query-gpu=enforced.power.limit,clocks.mem,utilization.gpu", "--format=csv,noheader,nounits"],
      { timeout: 3000 },
      (err, stdout) => {
        if (err) return resolve(null);
        const v = stdout.split("\n")[0].split(",").map((s) => Number(s.trim()));
        resolve(v.length === 3 && v.every((x) => Number.isFinite(x)) ? v : null);
      },
    );
  });
}

/** Samples nvidia-smi every `intervalMs` until stop() is called. Returns null when there is no NVIDIA GPU. */
export function startGpuSampler(intervalMs = 2000): () => Promise<GpuSample | null> {
  const rows: number[][] = [];
  const pending: Promise<void>[] = [];
  const tick = () => pending.push(querySmi().then((r) => void (r && rows.push(r))));
  const timer = setInterval(tick, intervalMs);
  setTimeout(tick, 500); // first sample once the model is working
  return async () => {
    clearInterval(timer);
    await Promise.all(pending);
    // keep only samples where the GPU was busy: an idle GPU drops to a low-power state by design
    const busy = rows.filter((r) => r[2] >= 20);
    const use = busy.length ? busy : rows;
    if (!use.length) return null;
    const col = (i: number) => use.map((r) => r[i]);
    return {
      samples: use.length,
      powerLimitW: { min: Math.min(...col(0)), max: Math.max(...col(0)) },
      memClockMHz: { min: Math.min(...col(1)), max: Math.max(...col(1)) },
      utilMaxPct: Math.max(...rows.map((r) => r[2])),
    };
  };
}

export function machineInfo() {
  let gpu: string | null = null;
  try {
    gpu = execSync("nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim();
  } catch {
    gpu = null;
  }
  let ollama: string | null = null;
  try {
    ollama = execSync("ollama --version", { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).toString().trim();
  } catch {
    ollama = null;
  }
  let gitCommit: string | null = null;
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    gitCommit = null;
  }
  return {
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 1e9),
    gpu,
    ollama,
    node: process.version,
    gitCommit,
  };
}
