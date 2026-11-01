---
name: cover-letter
description: Write a one-page cover-letter.tex for a saved role from master.tex evidence.
disable-model-invocation: true
---

# /cover-letter <slug>

Needs an active candidate from `/job-search` and an `evaluation.md` in the application folder.

1. Write `cover-letter.tex` in `job-search/workspaces/<person>/applications/<slug>/`, following "Draft and review" in `job-search/WORKFLOWS.md`: the role's problems, two or three pieces of `master.tex` evidence, a direct human tone. The `cover-letter-generator` skill holds useful technique.
2. Verify each company-specific claim against a public source, and cite it in `review.md`; drop claims you cannot verify.
3. Compile it as "Draft and review" describes and check it is one page.

Done when the letter is one page, every claim in it is traced in `review.md`, and you report the compile result honestly.
