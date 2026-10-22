# Resume

LaTeX resume sources plus the tooling that builds and publishes them. Each resume lives in `resumes/<name>/cv.tex` and compiles to a two-page PDF with `make build`, which uses tectonic, latexmk, or pdflatex, whichever is installed, and writes the result to `dist/`. `make check` verifies that every PDF exists, is non-trivial in size, and is exactly two pages. On each push to `main`, a GitHub Actions workflow compiles all resumes, packages the PDFs with the redirect pages in `site/`, and publishes them to the `build` branch that GitHub Pages serves.

## Credits

Based on [autoCV](https://github.com/jitinnair1/autoCV), an open-source LaTeX resume template with built-in publishing. The resume layout descends from [jakeryang/resume](https://github.com/jakeryang/resume).

Released under the [MIT License](LICENSE).
