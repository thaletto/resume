# Resume and job search

Two public LaTeX master resumes plus an agent-driven job search: skills in
`.agents/skills/`, candidate state through the Effect CLI in `job-search/cli/`,
and job discovery through the freehire MCP server.
Use `bun install`, `bun run typecheck`, `bun run lint` and `bun run test`.
Do not add Python or vendor the upstream ai-job-search framework.

Master resumes are `resumes/laxman-kr/cv.tex` and `resumes/sraya-rajan/cv.tex`.
`.github/workflows/build.yml` publishes their PDFs to GitHub Pages.

Personal job-search work starts with `/job-search laxman` or `/job-search sraya`;
ask which candidate when unspecified. Keep their evidence and state separate.
Personal workspaces under `job-search/workspaces/` are Git-ignored.

Read `job-search/WORKFLOWS.md` for candidate workflows and `job-search/README.md`
for commands and layout. Keep personal drafts under the selected application folder.
Write `state.json` only through `bun run job-search`.
Edit skills in `.agents/skills/`, then run `bun run skills:sync`.
Promoting a tailored draft to a public master requires an explicit request.
