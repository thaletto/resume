---
name: preferences
description: Confirm and record the active candidate's job preferences.
disable-model-invocation: true
---

# /preferences

Needs an active candidate from `/job-search`; ask for one if none is set.

1. Show the current `job-search/workspaces/<person>/preferences.md`.
2. Ask the candidate for each field: target roles, location, languages and proficiency, salary expectations, constraints and deal-breakers. Record only what they state; leave a field blank when they skip it.
3. Rewrite `preferences.md` in the template from `job-search/WORKFLOWS.md`, with their answers.

Done when you show the saved file and the candidate confirms it matches what they said.
