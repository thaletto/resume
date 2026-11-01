# Foldkit scaffold

Generated with the official `create-foldkit-app@latest` CLI:

```sh
bunx --bun create-foldkit-app@latest --name resume-foldkit-scaffold --rendering spa --example counter --package-manager bun
```

Generated baseline: Foldkit 0.170.0, Effect 4.1.0, Vite 8.
The scaffold's entry point, dependency versions, Foldkit Vite plugin,
strict TypeScript conventions, formatter and Foldkit guidelines form the frontend
baseline. The counter domain is replaced by the job-search model, messages,
commands and views. Source is placed under `job-search/app/` to keep the CLI,
server and public resume tools distinct.

Theme tokens and fonts are adapted from `thaletto/thaletto`'s public-site theme,
not its Next.js application code. Foldkit UI provides headless Button/Input
accessibility; native select and form controls retain browser semantics.
