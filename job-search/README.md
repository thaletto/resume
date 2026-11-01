# Native job-search app

## Architecture

This app implements the useful ideas from `ai-job-search` without carrying its
code, slash commands, templates, release system, or compatibility contracts.

| Component | Responsibility |
| --- | --- |
| `src/store.ts` | Candidate isolation, validated JSON storage, status history, draft folders |
| `src/server.ts` | Bun HTTP server, local dashboard and API |
| `src/discovery.ts` | Small adapter to freehire.me's public jobs API |
| `src/cli.ts` | Agent launcher and application management commands |
| `app/` | Officially scaffolded Foldkit SPA: Schema model, messages, Effect commands and Foldkit UI |
| `WORKFLOWS.md` | Repo-specific AI workflow for evaluation, drafting and interviews |
| `../scripts/resumes.ts` | LaTeX compilation and PDF checks |

The frontend uses Foldkit 0.170.0 and Effect 4.1.0 from the official scaffolder.
See [SCAFFOLD.md](SCAFFOLD.md) for the command and baseline. Its accessible Button
and Input helpers are styled with the active `public-site` light/dark theme from
`thaletto/thaletto`, using locally bundled Inter, JetBrains Mono and Libre Baskerville.

Backend operations return Effects, with Schema-validated persisted state, typed
application errors, per-candidate semaphores, cancellable discovery requests and
atomic writes with temporary-file cleanup. Bun HTTP and process callbacks execute
Effects at the runtime boundary.

There is no Python, copied job-search framework, CSV contract or upstream update mechanism.
Application IDs are UUIDs rather than company/title filenames: distinct openings
at the same company remain distinct. Duplicate source URLs are rejected per person.
Status history is retained even after an interview ends in rejection.

## Start

```sh
bun install
bun run dev
```

Open `http://127.0.0.1:8765`. Vite serves the Foldkit frontend and local API during
development. For production, use `bun run build` followed by `bun start`.
Use `bun run job-search serve --port 9000` to serve a built app on another port.
The server listens only on loopback; both candidates are available
to the local user. Profile separation is not multi-user authentication.

## Candidate setup

The first run creates `workspaces/laxman/` and `workspaces/sraya/`, each containing:

```text
master.tex                 # Snapshot of that person's public resume
state.json                 # Preferences, applications and status history
AGENTS.md / CLAUDE.md       # Candidate-scoped entry points
applications/<id>/         # Posting, brief, evaluation, drafts and interview notes
```

Initialization preserves existing evidence and application state. Profiles start
with blank preferences: fill in target roles, location, languages, compensation
and deal-breakers in the dashboard. No salary, language proficiency, relocation
or other preference is inferred from a resume.

The snapshot is not silently refreshed when a master changes. Update `master.tex`
deliberately when the candidate confirms new evidence. Tailored documents stay
local; publishing a tailored version requires explicitly updating the public master.

## Discovery and tracking

Search by keyword, optional two-letter country code (`IN`, `GB`, `US`) and work mode.
Discovery reads the freehire.me public API; it needs no login or API key. Failures
are reported in the interface. Save a result or paste a posting manually. Search
results are not AI-ranked; ask your agent to evaluate saved postings against evidence.

Statuses: saved, drafted, applied, interview, offer, hired, rejected, no response,
offer declined and withdrawn. A status change appends an event; editing notes does
not create a false stage transition. Counts show current statuses. Use Applied only
after actual submission. The application never sends submissions or outreach.

Select **Prepare drafts** to create the application's posting and agent brief.
These files are created only if missing, preserving candidate edits and previous drafts.

## Agent integration

```sh
bun run job-search launch laxman --agent opencode
bun run job-search launch sraya --agent claude
```

OpenCode, Claude Code and Codex can be launched when installed. The app uses your
agent's existing login/configuration rather than embedding an LLM provider or API key.
Ask it to follow [WORKFLOWS.md](WORKFLOWS.md) for a saved application's ID.

CLI commands (from the repository root):

```sh
bun run job-search list laxman
bun run job-search prepare laxman <application-id>
bun run job-search save laxman --file application.json
bun run job-search status laxman <application-id> --status interview --notes "Technical round scheduled"
bun run job-search doctor
```

An application JSON needs `company`, `role`, and `status`; optional fields are
`id`, `date`, `deadline`, `source`, `location`, `posting`, and `notes`.
Include `id` to edit; omitting it creates a new record. Edits preserve omitted fields.
The CLI and browser use the same Effect storage implementation. Avoid concurrent writes
from separate CLI/server processes; the server serializes its own per-candidate writes.

## Resume tooling

```sh
bun run build:resumes
bun run check:pdf
bun scripts/resumes.ts compile job-search/workspaces/laxman/applications/<id>/cv.tex
```

Compile runs from the repository root so the existing `assets/` paths work. Keep the
article/Inter style from the master. XeLaTeX is preferred, then LuaLaTeX or Tectonic.
No LaTeX engine is bundled. PDF checks use `pdf-lib` and enforce two pages for resumes.

The existing GitHub Pages workflow continues to publish only the two master PDFs.
Hosting the app remotely would require a backend deployment and authentication;
GitHub Pages cannot run a Bun server.
