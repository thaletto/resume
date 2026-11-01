---
name: job-search
description: Start a job-search session for one candidate (laxman or sraya).
disable-model-invocation: true
---

# /job-search <person>

1. Take `<person>` from the arguments: `laxman` or `sraya`. Anything else, or nothing: ask which candidate, and wait.
2. Run `bun run job-search init <person>` from the repository root, then `bun run job-search list <person>`.
3. Read `job-search/WORKFLOWS.md`, `job-search/workspaces/<person>/AGENTS.md` and `job-search/workspaces/<person>/master.tex`.
4. Hold `<person>` as the **active candidate** for the rest of the session. Every later command reads and writes only that workspace.

Done when you report back:
- the candidate's name and the evidence areas you found in `master.tex`;
- confirmed preferences, and which ones are blank (blank means unknown);
- applications grouped by status, with any deadline in the next 14 days first;
- the next useful command: `/preferences` when target roles are blank, otherwise `/find-jobs`, or `/evaluate <id>` for a saved role.
