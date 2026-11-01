# Resume & Job Search

LaTeX resumes and an agent-driven job search for **Laxman K R** and **Sraya Rajan**.
The existing GitHub Actions workflow builds and publishes the two master PDFs
to GitHub Pages on pushes to `main`.

## Job search

Requires [Bun](https://bun.sh) and an agent: Claude Code, opencode or Codex.
From the repository root run `bun install`, open your agent, then:

```text
/job-search laxman
/find-jobs backend engineer, India, remote
/evaluate <id>
/tailor <id>
```

Discovery comes from the [freehire](https://freehire.me) MCP server, configured
for each agent in `.mcp.json`, `opencode.json` and `.codex/config.toml`. Candidate
state is written only through the Effect CLI (`bun run job-search`). Personal data
lives under Git-ignored `job-search/workspaces/`. See
[job-search/README.md](job-search/README.md) for every command and
[job-search/WORKFLOWS.md](job-search/WORKFLOWS.md) for the workflow rules.

## Resume publishing

Master sources: `resumes/laxman-kr/cv.tex` and `resumes/sraya-rajan/cv.tex`.
Both use Inter and `fontspec`, requiring XeLaTeX, LuaLaTeX, or Tectonic.

```sh
bun run build:resumes
bun run check:pdf
```

The build writes `dist/Laxman_KR_Resume.pdf` and `dist/Sraya_Rajan_Resume.pdf`.
The PDF check verifies size and exactly two pages. Existing `make` targets are
also available. GitHub Pages serves the master PDFs; personal drafts are not part
of the published site.

## Development

```sh
bun run typecheck
bun run lint
bun run test
bun run skills:sync
```

## Credits

Resume layout based on [autoCV](https://github.com/jitinnair1/autoCV) and
[jakeryang/resume](https://github.com/jakeryang/resume).
Job-search workflow concepts studied from
[thaletto/ai-job-search](https://github.com/thaletto/ai-job-search) and rebuilt for
this repository. Live discovery uses the public [freehire.me](https://freehire.me) MCP server.

Released under the [MIT License](LICENSE).
