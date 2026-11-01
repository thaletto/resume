---
name: status
description: Record a status change for one of the active candidate's applications.
disable-model-invocation: true
---

# /status <slug> <status> [notes]

Needs an active candidate from `/job-search`. Valid statuses and the record format are in `job-search/WORKFLOWS.md` under "Workspace files".

1. `applied` needs the candidate to confirm they submitted it; `hired` needs them to confirm they accepted. Ask before recording either.
2. On `applied`, copy the submitted files in the application folder to dated names (for example `cv-submitted-2026-11-01.pdf`) so later drafts never replace them.
3. In `applications/<slug>/application.md`, set `status` and append one history line: `- YYYY-MM-DD · <status> · <notes>`.

Done when `application.md` shows the new status and its history ends with the new line, every earlier line unchanged.
