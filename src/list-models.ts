/** npm run list-models : prints the model ids the cloud key and the local Ollama actually expose,
 *  so config/models.json uses ids that exist (do not trust an assistant's guess). */
import { loadModels } from "./config.ts";
import { loadDotEnv } from "./paths.ts";

loadDotEnv();
const seen = new Set<string>();
for (const m of loadModels().models) {
  if (m.kind === "mock" || !m.baseUrl || seen.has(m.baseUrl)) continue;
  seen.add(m.baseUrl);
  const key = m.apiKeyEnv ? process.env[m.apiKeyEnv] : undefined;
  if (m.apiKeyEnv && !key) {
    console.log(`\n${m.baseUrl}: ${m.apiKeyEnv} not set, skipped`);
    continue;
  }
  try {
    const res = await fetch(`${m.baseUrl}/models`, { headers: key ? { authorization: `Bearer ${key}` } : {} });
    const body = (await res.json()) as { data?: { id: string }[] };
    const ids = (body.data ?? []).map((x) => x.id.replace(/^models\//, "")).sort();
    console.log(`\n${m.baseUrl} (${ids.length} models):`);
    for (const id of ids) console.log(`  ${id}`);
  } catch (e) {
    console.log(`\n${m.baseUrl}: unreachable (${(e as Error).message})`);
  }
}
