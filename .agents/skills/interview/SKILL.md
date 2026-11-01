---
name: interview
description: Prepare interview.md for an application in interview, from the posting and submitted documents.
disable-model-invocation: true
---

# /interview <application-id> [round details]

Needs an active candidate from `/job-search`.

1. Read `posting.md`, `evaluation.md` and the submitted CV and letter in `job-search/workspaces/<person>/applications/<application-id>/`.
2. Write `interview.md` following "Submission, outcomes and interviews" in `job-search/WORKFLOWS.md`: likely topics, STAR stories grounded in `master.tex`, honest bridge answers for each gap, questions for the interviewer. The `interview-prep-generator` skill holds useful technique.
3. When round details are given, add them to the notes with `/status <application-id> interview "<round details>"`.

Done when every gap from `evaluation.md` has a bridge answer and every STAR story cites its `master.tex` source.
