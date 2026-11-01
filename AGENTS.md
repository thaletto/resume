# Resume and job search

This is a TypeScript/Bun job-search app plus two public LaTeX master resumes.
The frontend was generated with create-foldkit-app and uses Foldkit + Effect.
Read FOLDKIT.md for framework conventions and job-search/SCAFFOLD.md for provenance.
Use Effect for backend operations and execute at HTTP/CLI runtime boundaries.
Layout: `job-search/domain` (shared Schemas and RPC contract), `job-search/server` (Effect services, RPC handlers, HTTP),
`job-search/cli` (`effect/cli` entry `main.ts`), `job-search/app` (Foldkit UI). The UI talks to the server only through the RPC contract at `/rpc`.
Use `bun install`, `bun run dev`, `bun run typecheck`, and `bun run test`.
Do not add Python or vendor the upstream ai-job-search framework.

Master resumes are `resumes/laxman-kr/cv.tex` and `resumes/sraya-rajan/cv.tex`.
`.github/workflows/build.yml` publishes their PDFs to GitHub Pages.

For personal job-search work, select **laxman** or **sraya** explicitly, then
use `bun run job-search launch <person> --agent opencode` and load the candidate's
`job-search/workspaces/<person>/AGENTS.md`. Ask which candidate if unspecified.
Never combine their evidence or state. Personal workspaces are Git-ignored.

Read `job-search/WORKFLOWS.md` for candidate workflows and `job-search/README.md`
for architecture. Keep personal drafts under the selected application folder.
Update applications through the CLI or dashboard, not by overwriting state.json.
Promoting a tailored draft to a public master requires an explicit request.
