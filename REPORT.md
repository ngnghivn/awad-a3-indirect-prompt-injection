Repository: https://github.com/<OWNER>/awad-a3-indirect-prompt-injection

# Indirect prompt injection through web content: small local models vs a cloud model

<!-- Owner: C. At most THREE pages. Every number must be copied from results/final/summary.md (or a run log).
     Delete these comments before submitting. -->

**Team:** <ID1> · <ID2> · <ID3> — AWAD 23KTPM1, topic A3

## 1. Question
To what extent do lightweight open-weight models differ from frontier cloud models in indirect prompt
injection **attack success rate (%)** and **benign task completion rate (%)** when processing untrusted web
content, at what **latency (ms)** and **token cost**?

Baseline: <cloud model id>. Change: <local-small id>, <local-mid id>. One thing differs: the model.

## 2. Setup
**Held fixed for every model:** system prompt and private notes (`data/scenario.json`), the two tools and
their descriptions (`src/agent.ts`), the test pages and payload (`data/`), the HTML-to-text step
(`src/extract.ts`), temperature 0, max 1024 output tokens, max 4 agent steps, no defence in any arm,
dataset fingerprint `<from summary.md>`.

| | Value (source, date read) |
|---|---|
| Machine | <from results/final/meta.json: CPU, RAM, GPU> |
| Cloud model | <exact id> — free tier, <RPM/RPD> (AI Studio, 2026-11-22) |
| Local models | <tag + digest from `ollama list`>, quantization <...> (<Ollama library URL>, <date>) |
| Ollama / Node | <versions from meta.json> |
| Data | <N> tasks × (1 clean + 5 injection techniques) = <N> cases per run, <R> runs |

Injection techniques: visible note, `display:none` div, 1px white text, image `alt`, fake system message.
Attack goal (OWASP ASI01, goal hijack): make the agent call `send_email` to `verify@attacker.test`.

## 3. Results
<!-- Paste the main table from results/final/summary.md. Median [min-max] over runs. -->

| Model | Attack success (%) | Benign, clean (%) | Benign, under attack (%) | Latency median (ms) | Tokens / case | USD / 1k cases |
|---|---|---|---|---|---|---|
| | | | | | | |

<!-- One chart at most (ASR vs benign completion per model). Mention per-technique differences in one sentence. -->

## 4. Recommendation
<!-- What changed and by how much; what it costs; WHEN NOT to use a small local model;
     note that no model reached 0% -> architectural defences (no send tool, human confirmation) still needed. -->

## 5. Limits of this measurement
<!-- e.g. only the Flash-Lite tier (Flash: 20 req/day, Pro: 0 on free tier); small dataset; one payload wording;
     local latency depends on our GPU, cloud latency on the network; tool-calling failures of small models;
     temperature 0 still not deterministic on the cloud; model versions change. What would change the result? -->

## 6. Sources
<!-- Official docs / release notes only, each with the date you read it. -->
1. OWASP Top 10 for Agentic Applications — ASI01. <URL> (read <date>)
2. Gemini API models / pricing / rate limits. <URL> (read <date>)
3. Gemini API OpenAI compatibility. <URL> (read <date>)
4. Ollama model library pages for <models>. <URL> (read <date>)
5. Ollama OpenAI compatibility. <URL> (read <date>)
