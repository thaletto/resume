# Job search

Agent-driven job search for Laxman and Sraya, built from three parts:

| Part   | Where                                        | Job                                                                   |
| ------ | -------------------------------------------- | --------------------------------------------------------------------- |
| Skills | `../.agents/skills/` (8 slash commands)      | The workflow, run from any agent: Claude Code, opencode or Codex      |
| State  | `workspaces/<person>/state.json` via `cli/`  | Preferences, applications and status history, written only by the CLI |
| MCP    | freehire at `https://freehire.me/api/v1/mcp` | Job discovery, full postings, open checks, salary and market data     |

There is no server, dashboard or API key. The agent you already use does the work.

## Commands

Open your agent in the repository root, then:

```text
/job-search laxman          choose the candidate for this session
/preferences                record confirmed target roles, location, salary, constraints
/find-jobs backend, IN      search freehire, shortlist, check open, save picks
/evaluate <id>              evaluation.md: evidence vs requirements, pursue/clarify/skip
/tailor <id>                cv.tex + review.md from master.tex evidence
/cover-letter <id>          one-page cover-letter.tex
/status <id> applied        record a status change (applied/hired need your confirmation)
/interview <id>             interview.md: topics, STAR stories, gap answers
```

Skill and MCP discovery per agent:

| Agent       | Skills                                    | MCP config           | Invoke        |
| ----------- | ----------------------------------------- | -------------------- | ------------- |
| Claude Code | `.claude/skills/` (synced copy)           | `.mcp.json`          | `/job-search` |
| opencode    | `.opencode/command/` (generated wrappers) | `opencode.json`      | `/job-search` |
| Codex       | `.agents/skills/`                         | `.codex/config.toml` | `$job-search` |

`.agents/skills/` is the source of truth. After editing a skill there, run
`bun run skills:sync` to refresh the Claude Code copies and opencode wrappers
(`bun install` runs it too; both outputs are Git-ignored).

## State

```text
workspaces/<person>/
  master.tex          snapshot of the public resume; the only evidence source
  state.json          preferences, applications, status history
  AGENTS.md CLAUDE.md candidate-scoped entry points
  applications/<id>/  posting.md, brief.md, evaluation.md, drafts, interview notes
```

`workspaces/` is Git-ignored. Write state only through the CLI, which validates
every field, keeps status history and writes atomically:

```sh
bun run job-search init [laxman|sraya|all]
bun run job-search list <person>
bun run job-search save <person> --file application.json
bun run job-search preferences <person> --file preferences.json
bun run job-search status <person> <id> --status interview --notes "Round 1"
bun run job-search prepare <person> <id>
bun run job-search doctor
```

An application JSON needs `company`, `role` and `status`; optional fields are
`id`, `date`, `deadline`, `source`, `location`, `posting` and `notes`. Include
`id` to edit; omitted fields keep their saved values. Duplicate source URLs are
rejected per candidate. `JOB_SEARCH_WORKSPACES=<dir>` redirects storage (tests use it).

## Code

| Path           | Contents                                                        |
| -------------- | --------------------------------------------------------------- |
| `domain/`      | Effect Schemas for state, inputs and tagged errors              |
| `state/`       | `WorkspaceConfig` and `Store` Effect services, rules, templates |
| `cli/main.ts`  | `effect/cli` commands over the `Store`                          |
| `WORKFLOWS.md` | Evaluation, drafting and interview rules the skills point to    |

```sh
bun run test       # vitest + @effect/vitest, temp workspaces only
bun run lint
bun run typecheck
```

## Resumes

```sh
bun run build:resumes
bun run check:pdf
bun scripts/resumes.ts compile job-search/workspaces/<person>/applications/<id>/cv.tex
```

XeLaTeX is preferred, then LuaLaTeX or Tectonic; none is bundled. Compile from the
repository root so `assets/` paths resolve.
