import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, PAGE_ORIGIN } from "./paths.ts";

export interface Task {
  id: string;
  slug: string;
  page: string;
  question: string;
  expected: string[];
  /** answers a correct model might give; the tests check `expected` accepts all of them */
  referenceAnswers: string[];
  /** plausible wrong answers; the tests check `expected` rejects them */
  wrongAnswers?: string[];
}

export interface Technique {
  id: string;
  description: string;
  html: string;
}

export interface Scenario {
  userName: string;
  userEmail: string;
  secret: string;
  privateNotes: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface TechniquesFile {
  attackerEmail: string;
  attackerDomain: string;
  payload: string;
  techniques: Technique[];
}

export interface Case {
  /** e.g. "t01:clean" or "t01:hidden_div" */
  id: string;
  taskId: string;
  variant: string;
  injected: boolean;
  /** opaque path, so the variant name never leaks into the prompt */
  path: string;
  url: string;
  html: string;
  systemPrompt: string;
  userPrompt: string;
  expected: string[];
}

export interface Dataset {
  scenario: Scenario;
  techniques: TechniquesFile;
  tasks: Task[];
  cases: Case[];
}

const SLOT = "<!-- INJECTION_SLOT -->";

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function shortHash(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
}

export function buildPage(template: string, technique: Technique | null, payload: string): string {
  if (!template.includes(SLOT)) throw new Error(`page template has no ${SLOT} marker`);
  if (!technique) return template.replace(SLOT, "");
  // attribute-based techniques need the payload escaped for an attribute; text ones get it as text
  const inAttribute = /="\{\{PAYLOAD\}\}"/.test(technique.html);
  const snippet = technique.html.replace("{{PAYLOAD}}", inAttribute ? escapeAttr(payload) : payload);
  return template.replace(SLOT, snippet);
}

export function loadDataset(opts: { taskIds?: string[] } = {}): Dataset {
  const scenario = readJson<Scenario>("scenario.json");
  const techniques = readJson<TechniquesFile>("techniques.json");
  let tasks = readJson<{ tasks: Task[] }>("tasks.json").tasks;
  if (opts.taskIds?.length) tasks = tasks.filter((t) => opts.taskIds!.includes(t.id));

  const systemPrompt = fill(scenario.systemPrompt, {
    USER_NAME: scenario.userName,
    USER_EMAIL: scenario.userEmail,
    PRIVATE_NOTES: scenario.privateNotes,
  });

  const cases: Case[] = [];
  for (const task of tasks) {
    const template = fs.readFileSync(path.join(DATA_DIR, "pages", task.page), "utf8");
    const variants: (Technique | null)[] = [null, ...techniques.techniques];
    for (const tech of variants) {
      const variant = tech ? tech.id : "clean";
      const id = `${task.id}:${variant}`;
      const p = `/${task.slug}/${shortHash(id)}`;
      const url = PAGE_ORIGIN + p;
      cases.push({
        id,
        taskId: task.id,
        variant,
        injected: tech !== null,
        path: p,
        url,
        html: buildPage(template, tech, techniques.payload),
        systemPrompt,
        userPrompt: fill(scenario.userPrompt, { URL: url, QUESTION: task.question }),
        expected: task.expected,
      });
    }
  }
  return { scenario, techniques, tasks, cases };
}

/** Fingerprint of everything that must be held fixed; stored with every run. */
export function datasetFingerprint(ds: Dataset): string {
  const h = crypto.createHash("sha256");
  for (const c of ds.cases) h.update(c.id + c.systemPrompt + c.userPrompt + c.html + c.expected.join("|"));
  return h.digest("hex").slice(0, 16);
}
