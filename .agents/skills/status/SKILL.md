---
name: status
description: Record a status change for one of the active candidate's applications.
disable-model-invocation: true
---

# /status <application-id> <status> [notes]

Needs an active candidate from `/job-search`. Valid statuses: `saved`, `drafted`, `applied`, `interview`, `offer`, `hired`, `rejected`, `no_response`, `offer_declined`, `withdrawn`.

1. `applied` needs the candidate to confirm they submitted it; `hired` needs them to confirm they accepted. Ask before recording either.
2. On `applied`, copy the submitted files in the application folder to dated names (for example `cv-submitted-2026-11-01.pdf`) so later drafts never replace them.
3. Run `bun run job-search status <person> <application-id> --status <status> --notes "<notes>"`.

Done when the CLI prints the application with the new status appended to its history.
