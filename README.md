# Resume & Job Search

LaTeX resumes and a local job-search app for **Laxman K R** and **Sraya Rajan**.
The existing GitHub Actions workflow builds and publishes the two master PDFs
to GitHub Pages on pushes to `main`.

## Job-search app

Requires [Bun](https://bun.sh). From the repository root:

```sh
bun install
bun run dev
```

Open **http://127.0.0.1:8765**. The app supports:

- Separate candidate profiles and search preferences.
- Public job discovery by keyword, country, and work mode.
- Saved jobs, applications, deadlines, notes, and status history.
- Full job descriptions and application folders for AI-assisted evaluation,
  CV tailoring, cover letters, reviews, and interview preparation.

```sh
bun run job-search launch laxman --agent opencode
bun run job-search launch sraya --agent opencode
```

The launcher opens your installed agent in the selected person's workspace.
Personal data lives under Git-ignored `job-search/workspaces/`. The frontend is an
officially scaffolded **Foldkit + Effect** SPA using the `thaletto/thaletto` theme.
The Bun backend uses Effect for storage, discovery, validation, and CLI operations.
It does not require Python or an upstream framework.
See [job-search/README.md](job-search/README.md) and
[job-search/WORKFLOWS.md](job-search/WORKFLOWS.md).

## Resume publishing

Master sources: `resumes/laxman-kr/cv.tex` and `resumes/sraya-rajan/cv.tex`.
Both use Inter and `fontspec`, requiring XeLaTeX, LuaLaTeX, or Tectonic.

```sh
bun run build:resumes
bun run check:pdf
```

The build writes `dist/Laxman_KR_Resume.pdf` and `dist/Sraya_Rajan_Resume.pdf`.
The PDF check verifies size and exactly two pages. Existing `make` targets are
also available. GitHub Pages serves the master PDFs; the local app and personal
drafts are not part of the published site.

## Development

```sh
bun run typecheck
bun run lint
bun test
bun run build
```

## Credits

Resume layout based on [autoCV](https://github.com/jitinnair1/autoCV) and
[jakeryang/resume](https://github.com/jakeryang/resume).
Job-search workflow concepts studied from
[thaletto/ai-job-search](https://github.com/thaletto/ai-job-search) and rebuilt for
this repository. Live discovery uses the public [freehire.me](https://freehire.me) API.

Released under the [MIT License](LICENSE).
