---
name: evaluate
description: Judge how well a saved role fits the active candidate and write evaluation.md.
disable-model-invocation: true
---

# /evaluate <slug>

Needs an active candidate from `/job-search`. Work in `job-search/workspaces/<person>/applications/<slug>/`.

1. Read `posting.md`. When it is missing or empty, ask the candidate to paste the description, or use freehire `get_job` when the source is a freehire posting, and save it to `posting.md`.
2. Write `evaluation.md` with the sections in `job-search/WORKFLOWS.md` under "Discover and evaluate". Every requirement gets either cited `master.tex` evidence or the word **gap**.

Done when `evaluation.md` ends in a pursue, clarify or skip recommendation, and you show it to the candidate before any drafting. Next step on pursue: `/tailor <slug>`.
