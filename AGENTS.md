# Resume and job search

Two public LaTeX master resumes plus an agent-driven job search: slash-command
skills in `.agents/skills/`, candidate state as markdown files, and job discovery
through the freehire MCP server. There is no application code.
Do not add Python or vendor the upstream ai-job-search framework.

Master resumes are `resumes/laxman-kr/cv.tex` and `resumes/sraya-rajan/cv.tex`.
`.github/workflows/build.yml` publishes their PDFs to GitHub Pages.

Personal job-search work starts with `/job-search laxman` or `/job-search sraya`;
ask which candidate when unspecified. Keep their evidence and state separate.
Personal workspaces under `job-search/workspaces/` are Git-ignored.

Read `job-search/WORKFLOWS.md` for the workspace file formats and the workflow,
and `job-search/README.md` for the commands. Keep personal drafts under the
selected application folder. Edit skills in `.agents/skills/`, then run
`sh scripts/sync-skills.sh`. Promoting a tailored draft to a public master
requires an explicit request.
