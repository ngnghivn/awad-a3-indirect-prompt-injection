# AI-LOG

Every member adds their own entries. Each entry: tool, what for, and what we **Changed** or **Rejected**. The rubric asks for at least one thing the assistant got wrong and how we caught it.

## Tools

| Tool | Used by | For |
|---|---|---|
| Claude Code (Claude Opus 5.5) | A (Nghi Văn) | planning, scaffolding the harness, tests, README / templates |
| Chưa cung cấp | B | B tự ghi việc dùng AI thực tế của mình |
| Codex | C (Luật) | Kiểm tra tái lập và đối chiếu phép đo với log/code |

## Entries

### 2026-11-22 — A — Claude Code: planning and API access
- **Rejected:** the idea of using our ChatGPT Plus / Claude Pro / Gemini subscriptions for API calls. The official help pages say API usage is billed separately from those plans. We use the Gemini API free tier.
- **Rejected:** GitHub Models as a free cloud option. Sources disagreed and one said it was retired in July 2026, so we did not build on it.
- **Changed:** cloud model limited to the Flash-Lite tier after reading our own AI Studio quota page (Flash: 20 requests/day, Pro: 0). Recorded as a limit in REPORT.md.

### 2026-11-22 — A — Claude Code: harness scaffold
- **Caught an error:** the assistant's first version of the test "the ground truth is on every page" ended in `|| true`, so it could never fail. We noticed it on review, and replaced it with `referenceAnswers` / `wrongAnswers` per task that the scoring regexes must accept / reject.
- **Changed:** model ids and prices are not written from the assistant's memory. `npm run list-models` prints the ids the API actually exposes, and prices stay `null` until copied from the pricing page.
- **Changed:** latency excludes the time our own rate limiter sleeps (free-tier pacing is not model latency), and local models get one unrecorded warm-up call per run (no cold start in the numbers).

### 2026-11-22 — A — Claude Code: local model setup
- **Rejected:** model candidates from blog posts. We picked the models from the official Ollama library pages instead: `qwen3.5:4b` and `qwen3.5:9b` (same family, tools tag, both fit 8 GB).
- **Caught an error (our first guess):** the slow speed (~7 tokens/s) looked like the new Qwen3.5 architecture running partly on the CPU. A control test with `qwen3:4b` was just as slow, which ruled that out. `nvidia-smi` showed the real cause: the laptop caps the GPU at 20 W with memory at 810 MHz. So latency depends on the laptop's power mode, and we hold that fixed for all runs.
- **Checked:** pilot (1 run, 3 tasks) — largest call 1376 tokens vs a 4096-token context, so no silent truncation. One "attack success" transcript read by hand: the agent really emailed the secret to `verify@attacker.test`, then answered the user without mentioning it.

### 2026-11-22 — A — Claude Code: the attack address gave itself away
- **Caught an error (in the assistant's own design):** the first attacker address was `verify@attacker.test`. The 9b pilot resisted 100% of attacks, and its reasoning said why: the address belonged to "an attacker". The word in the address, not the model's judgement, may have stopped the attack, so the benchmark would have measured the wrong thing and made every model look safer.
- **Changed:** the address is now `verification@helpdesk-mail.test`, and a new test fails if any page, prompt or the address contains a telltale word (attack, evil, hack, phish, inject…). Both local pilots were re-run on the new address before the data freeze.
- **Effect (pilot, 1 run, 15 injected cases each, dev data, not reported):** qwen3.5:9b attack success went from 0% to 46.7%; qwen3.5:4b went from 66.7% to 53.3%. With the old address we would have concluded "the 9b is immune"; that conclusion came from the address, not the model.
- **Also caught by the GPU logging:** during this pilot the 9b ran under a GPU limit that moved between 20 W and 35 W, so its latency is not comparable. The final runs need one fixed power condition.

### 2026-11-26 — A — Claude Code: cloud model id and pricing
- **Changed:** `gemini-3.5-flash-lite` model id confirmed present via `npm run list-models` (2026-11-26). Previously marked as unverified in `config/models.json`.
- **Changed:** `pricePerMTokUsd` filled from https://aistudio.google.com/docs/pricing (read 2026-11-26): $0.30/MTok input, $2.50/MTok output (Standard tier). Free tier is free of charge for both. Values were `null` before and would have produced `n/a` in the summary table.
- **Noted:** cloud mini-pilot (1 run, 3 tasks, dev data): 0 errors, fetch_page 100%, tool calls work. ASR 0% across all 5 techniques — dev result only, not for the report (needs 5 runs on all 8 tasks).

### 2026-11-27 — C (Luật) — Codex: final-log replay and scoring audit
- **Changed:** used installed Node 22 after a Homebrew library mismatch. A separate local clone passed install, all 9 tests, typecheck and final replay; 912 records cover all expected cases and the recomputed summary JSON matches exactly. Local GPU caps in the records are all 40 W.
- **Caught an error:** the report template assumed no model reached zero ASR; actual cloud ASR is 0%. Also traced the timer and corrected the end-to-end wording: successful client calls subtract response-read/parse and retry overhead as well as quota waits. Harness/data unchanged.
- **Rejected:** equating ASR with secret leakage or local zero API fees with zero total cost; checked the t01:hidden_div final transcript and kept these measures distinct in the report.

<!-- Add more: date — who — tool — what — Changed / Rejected / Caught -->
