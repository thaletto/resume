---
name: tailor
description: Write a tailored cv.tex and review.md for a saved role from master.tex evidence.
disable-model-invocation: true
---

# /tailor <slug>

Needs an active candidate from `/job-search` and an `evaluation.md` in `job-search/workspaces/<person>/applications/<slug>/`. Without one, run `/evaluate` first.

1. Write `cv.tex` in that folder from `../../master.tex`, following "Draft and review" in `job-search/WORKFLOWS.md`. The `resume-tailor` and `tech-resume-optimizer` skills hold useful technique; their truthfulness rules apply.
2. Compile it as "Draft and review" describes and check it is two pages. With no LaTeX engine installed, record the draft as uncompiled.
3. Write `review.md`: every changed claim traced to `master.tex`, every posting requirement marked met or gap.

Done when `cv.tex` and `review.md` exist, every claim in `review.md` is traced, and you report the compile result honestly. Then record `drafted` with `/status <slug> drafted`.
