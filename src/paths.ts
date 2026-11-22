import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data");
export const CONFIG_DIR = path.join(ROOT, "config");
export const RESULTS_DIR = path.join(ROOT, "results");

/** Fixed so that the prompt text (which contains the URL) is identical on every machine. */
export const PAGE_PORT = Number(process.env.PAGE_PORT ?? 8787);
export const PAGE_ORIGIN = `http://localhost:${PAGE_PORT}`;

export function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch {
    // no .env file: fine, cloud models will be skipped
  }
}
