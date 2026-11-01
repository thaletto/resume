---
name: preferences
description: Confirm and record the active candidate's job preferences.
disable-model-invocation: true
---

# /preferences

Needs an active candidate from `/job-search`; ask for one if none is set.

1. Show the current preferences from `bun run job-search list <person>`.
2. Ask the candidate for each field: target roles (up to 20), location, languages and proficiency, salary expectations, constraints and deal-breakers. Record only what they state; leave a field blank when they skip it.
3. Write the full set to `job-search/workspaces/<person>/preferences.json` as `{ "roles": [], "location": "", "languages": "", "salary": "", "constraints": "" }`.
4. Run `bun run job-search preferences <person> --file job-search/workspaces/<person>/preferences.json`, then delete that file.

Done when the CLI prints the saved preferences and they match what the candidate confirmed.
