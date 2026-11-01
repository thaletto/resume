# Job search

Agent-driven job search for Laxman and Sraya, with no application code:

| Part   | Where                                        | Job                                                               |
| ------ | -------------------------------------------- | ----------------------------------------------------------------- |
| Skills | `../.agents/skills/` (8 slash commands)      | The workflow, run from Claude Code, opencode or Codex             |
| State  | `workspaces/<person>/` markdown files        | Preferences, applications and status history                      |
| MCP    | freehire at `https://freehire.me/api/v1/mcp` | Job discovery, full postings, open checks, salary and market data |

## Commands

Open your agent in the repository root, then:

```text
/job-search laxman          choose the candidate for this session
/preferences                record confirmed target roles, location, salary, constraints
/find-jobs backend, IN      search freehire, shortlist, check open, save picks
/evaluate <slug>            evaluation.md: evidence vs requirements, pursue/clarify/skip
/tailor <slug>              cv.tex + review.md from master.tex evidence
/cover-letter <slug>        one-page cover-letter.tex
/status <slug> applied      record a status change (applied/hired need your confirmation)
/interview <slug>           interview.md: topics, STAR stories, gap answers
```

| Agent       | Skills                                    | MCP config           | Invoke        |
| ----------- | ----------------------------------------- | -------------------- | ------------- |
| Claude Code | `.claude/skills/` (synced copy)           | `.mcp.json`          | `/job-search` |
| opencode    | `.opencode/command/` (generated wrappers) | `opencode.json`      | `/job-search` |
| Codex       | `.agents/skills/`                         | `.codex/config.toml` | `$job-search` |

`.agents/skills/` is the source of truth. After cloning or editing a skill, run
`sh scripts/sync-skills.sh` (or `make skills`) to refresh the Git-ignored Claude
Code copies and opencode wrappers.

## State

Each candidate's workspace is Git-ignored and holds `master.tex`, `preferences.md`
and one `applications/<slug>/` folder per role, with `application.md` (status and
append-only history), `posting.md` and the drafts. The exact formats and rules are
in [WORKFLOWS.md](WORKFLOWS.md#workspace-files). `/job-search` creates a missing
workspace.

## Resumes

```sh
make build    # dist/Laxman_KR_Resume.pdf and dist/Sraya_Rajan_Resume.pdf
make check    # both exactly two pages (needs pdfinfo)
```

Tectonic is preferred, then XeLaTeX; the resumes use `fontspec`, so pdfLaTeX
cannot build them. Compile drafts from the repository root so `assets/` resolves.
