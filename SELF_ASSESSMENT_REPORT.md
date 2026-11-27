# Self-assessment

**Team:** 23127221 · 23127281 · 23127446 — AWAD 23KTPM1, A3.

**Evidence reviewed:** 27 November 2026. This assessment follows the official *Seminar Brief and Rubric*, pp. 6–9, supplied by the team and read on this date. The six criteria, score bands and language requirement replace the earlier provisional assessment based only on the repository outline. This is a current-state assessment; criterion 4 must be updated from the actual recording.

| # | Official criterion | Maximum | Currently claimed | Evidence and reason for the claim |
|---|---|---|---|---|
| 1 | The question and the baseline | 15 | 12 | REPORT §1–2 states the question, units, models and fixed harness. Cloud and local arms also differ in backend, hardware and model family. This matches the rubric's 8–12 band for a clear question with a baseline differing in more than one thing; we do not claim 13–15. |
| 2 | The measurement re-runs | 30 | 28 | README; results/final/meta.json, summary.md and every reported JSONL. Nine cloud runs and five runs per local model, each with 48 unique cases, median and spread. A separate local clone passed install, 9 tests, typecheck and replay; summary JSON matches. C verified replay, not a fresh live-model timing replication; runtime identity/context snapshots are limited as disclosed in REPORT §5. |
| 3 | Findings and recommendation | 20 | 18 | REPORT §3–5; slides 5–7: security/utility trade-off, latency, tokens and estimated cost, when not to grant autonomous send access, and measurement limits. The report identifies changes to payload, extraction, runtime and network that could change results. Defenses and total operating cost are not measured. |
| 4 | The talk | 15 | 0 | TALK.md contains the pending video link and a filming script for all three members; slides.pdf is ready, but no recording or accessible link has been supplied. The rubric scores the actual recording, not the prepared script. |
| 5 | Sources and facts | 10 | 10 | REPORT §6: official model/API/pricing documentation, Node and Ollama release notes, with read dates. Runtime machine/version observations are attributed to meta.json; project quota and full GPU residency are not presented as independently verified public guarantees. |
| 6 | AI-LOG.md | 10 | 9 | AI-LOG identifies tools and parts, concrete Changed/Rejected entries and caught errors: the always-passing test, address bias and timing interpretation. These are team-level evidence under the 9–10 band. B's own entry remains outstanding under the team's separate working agreement; we do not invent it. |
| | **Current total** | **100** | **77** | Provisional until the recording and final evidence review. |

## What we did not manage

- The recorded talk, its accessible link and measured duration are not available yet. We cannot claim that all members have spoken or that the final video satisfies the time limit.
- The cloud/local comparison does not isolate model size or keep inference hardware identical. We disclose this limitation rather than claiming a fully controlled size-only experiment.
- Defenses, total hardware/electricity cost and a live-model timing replication on C's machine were not measured. Runtime model identity/context capture and B's planned broader manual scorer review remain incomplete in the supplied evidence.

## Before submission

1. Record the talk within 8 minutes, with every member speaking, an opening question, visible measurement execution **or its log**, a headline value with unit and spread, and a recommendation at the end. Insert and privately test the same viewing link in TALK.md and FACEBOOK.md.
2. Update criterion 4 from the actual recording and add timestamp evidence. Review every claimed row and the total against the final repository. A public repository and the submission archive must include the source, all reported raw logs and the `.git` directory.
3. Name the zip `23127221-23127281-23127446_<final-total>.zip`; the number must match the final table. One member submits from their student Google account. No zip has been prepared here.
4. The official overall deadline is **17 December 2026, 22:00** (handout p. 1); the team's **29 November, 22:00** target remains its own earlier plan. Posting by Sunday 22:00 enters that week's vote. Facebook posting affects eligibility for the vote, not the rubric score itself.
5. After Classroom assigns the red-team partner, file the required evidence-backed issue within 7 days, by the assigned deadline. The rubric's separate 10-point deduction applies if no issue is filed; this future obligation is not represented as completed or deducted in the table above.

The rubric compares the claimed total with the lecturer's awarded mark before the red-team rule. Keep claims tied to evidence and revise the total after recording; the current 77 is not a promised final grade or the final submission filename.
