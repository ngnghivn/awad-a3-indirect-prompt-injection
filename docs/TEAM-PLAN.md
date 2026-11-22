# Team plan (internal)

Deadline: **Sunday 2026-11-29, 22:00** (zip + Facebook post). Earlier is better: vote ties go to the
team that turned in first.

## Roles

| | A (lead) | B | C |
|---|---|---|---|
| Owns | harness, `config/models.json`, runs on the RTX A2000, `results/final` | `data/`: 8 tasks, pages, regexes; checks the scorer by hand | sources + facts, README check, REPORT.md, slides, TALK.md, FB post, self-assessment |
| Talk | ~2.5 min: setup + measurement running + numbers | ~1.5 min, scripted by C: the attack demo | ~3 min: question, recommendation, limits |
| Red team (Nov 30 – Dec 2) | re-run their command | check their baseline and logs | check their sources, write the issue |

Everyone: log your own AI use in AI-LOG.md (at least one Changed/Rejected entry each).

## Timeline

| Day | A | B | C |
|---|---|---|---|
| Sun 22 | repo + harness (done); create the public GitHub repo; install Ollama | read data/README.md | read the brief; start the sources list |
| Mon 23 | pick 2 local models (tools tag, fit in 8 GB), test end-to-end on t01–t03 | tasks t04–t08 + `npm test` green | verify: OWASP ASI01 wording, Gemini model id/pricing/OpenAI compat, Ollama model pages (with dates) |
| Tue 24 | `.env` key, `npm run list-models`, first cloud cases | `npm run serve` review of all 48 pages | REPORT §1–2 + §6 draft; slides outline |
| Wed 25 | **pilot**: 1 run of every model into `results/dev-pilot` | **hand-check ~20 pilot cases**: does each score match the transcript? | talk script incl. B's part |
| Thu 26 | **code + data freeze (git tag `v1`)**; `npm run measure -- --out results/final` runs 1–4 (cloud quota ≈ 500/day) | fresh-clone test on own laptop using README only | fresh-clone test too; note every missing step |
| Fri 27 | run 5 (`--start 5 --runs 1 --out results/final`); `npm run replay` | — | REPORT §3–5 with numbers ONLY from `results/final/summary.md`; slides |
| Sat 28 | check every number on slides/REPORT exists in a log | rehearse | record ≤ 8 min, upload unlisted, TALK.md |
| Sun 29 | zip incl. `.git`: `<ID1>-<ID2>-<ID3>_<total>.zip` (ascending); submit from one student account | | FB post: `#AWADSeminar23KTPM1`, title, question, one headline number, talk link |

Cloud quota resets at midnight Pacific time = **15:00 Vietnam time**.

## Before submitting (checklist)
- [ ] Fresh clone → README steps → `npm test` and `npm run replay` work on a second machine
- [ ] `results/final` has ≥ 5 runs per model (or REPORT says why not)
- [ ] REPORT.md ≤ 3 pages, repository link on line 1, held-fixed list, limits, when NOT to use
- [ ] Every number in REPORT and slides appears in `results/final/summary.md`
- [ ] Every version / date / status / price cites an official page with the date read
- [ ] slides/slides.pdf, TALK.md link opens in a private window, video ≤ 8:00, every member speaks
- [ ] AI-LOG.md has real Changed/Rejected entries from all three members
- [ ] SELF_ASSESSMENT_REPORT.md total = number in the zip name
