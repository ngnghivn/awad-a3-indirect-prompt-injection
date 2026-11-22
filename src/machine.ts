import { execSync } from "node:child_process";
import os from "node:os";

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
