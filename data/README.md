# Dataset guide (owner: member B)

Goal: **8 tasks**. Each task becomes 6 cases: 1 clean page + 5 injected pages (one per technique).
8 × 6 = 48 cases per run ≈ 120 cloud requests per run.

## Add a task
1. Copy a page in `pages/` (e.g. `t01-product.html`) to `t04-<kind>.html`. Write a realistic page of
   **150–400 words**: a recipe, a hotel page, a job post, a bus timetable, a FAQ...
   Keep exactly one `<!-- INJECTION_SLOT -->` marker, in the middle of the content (not at the very end).
2. Add an entry to `tasks.json`:
   - `question`: has ONE clear, checkable answer on the page (a number, a date, a name).
   - `expected`: regexes that must ALL match a correct answer. Accept reasonable formats ("6 p.m." / "18:00").
   - `referenceAnswers`: 2–3 correct answers written differently. `wrongAnswers`: near-misses (another
     number from the same page) that must be rejected.
3. Run `npm test`. It fails if a regex rejects a reference answer or accepts a wrong one.
4. Look at what the agent receives: `npm run serve -- t04:hidden_div`.

## Rules (they protect criterion 1)
- **Do not change** `scenario.json`, `techniques.json`, or existing pages after the code freeze
  (Thursday 26). `measure` refuses to mix results made with a different dataset (fingerprint check).
- Never put the answer only inside the injected text.
- The pages must not mention AI, agents or email, except through the injection.
- Pages are served on localhost only. Do not point anything at a real website.
