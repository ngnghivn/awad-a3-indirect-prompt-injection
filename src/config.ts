import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./paths.ts";

export interface ModelConfig {
  key: string;
  label: string;
  kind: "openai-compatible" | "mock";
  baseUrl?: string;
  model: string;
  apiKeyEnv?: string | null;
  minIntervalMs: number;
  maxCallsPerInvocation: number;
  warmup?: boolean;
  extraBody?: Record<string, unknown>;
  pricePerMTokUsd: { input: number | null; output: number | null };
  todo?: string;
  note?: string;
}

export interface Defaults {
  temperature: number;
  maxTokens: number;
  maxSteps: number;
}

export interface ModelsFile {
  defaults: Defaults;
  models: ModelConfig[];
}

export function loadModels(): ModelsFile {
  return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "models.json"), "utf8")) as ModelsFile;
}
