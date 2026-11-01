---
name: evaluate
description: Judge how well a saved role fits the active candidate and write evaluation.md.
disable-model-invocation: true
---

# /evaluate <application-id>

Needs an active candidate from `/job-search`.

1. Run `bun run job-search prepare <person> <application-id>` and work in the folder it prints.
2. Read `posting.md`. When it holds no description, ask the candidate to paste one, or use freehire `get_job` when the source is a freehire posting.
3. Write `evaluation.md` with the sections in `job-search/WORKFLOWS.md` under "Discover and evaluate". Every requirement gets either cited `master.tex` evidence or the word **gap**.

Done when `evaluation.md` ends in a pursue, clarify or skip recommendation, and you show it to the candidate before any drafting. Next step on pursue: `/tailor <application-id>`.
