import { PDFDocument } from "pdf-lib";
import { mkdir, readFile, copyFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { ROOT, profiles, PEOPLE, person } from "../job-search/src/store.ts";
import { AppError, io, attempt } from "../job-search/src/errors.ts";

export const checkPDF = Effect.fn("checkPDF")(function* (path: string, expected = 2) {
  const contents = yield* io(() => readFile(path));
  if (contents.length < 1000) { return yield* Effect.fail(new AppError({ message: `Empty PDF: ${path}`, code: "pdf" })); }
  const document = yield* io(() => PDFDocument.load(contents), "pdf");
  if (document.getPageCount() !== expected) { return yield* Effect.fail(new AppError({ message: `${path}: expected ${expected} pages, got ${document.getPageCount()}`, code: "pdf" })); }
  yield* Effect.log(`${path}: ${expected} pages, ${contents.length} bytes`);
});

export const compile = Effect.fn("compileResume")(function* (source: string, output = dirname(resolve(source))) {
  const engine = yield* Effect.sync(() => ["xelatex", "lualatex", "tectonic"].find(engine => Bun.which(engine)));
  if (!engine) { return yield* Effect.fail(new AppError({ message: "Install XeLaTeX, LuaLaTeX or Tectonic to compile fontspec resumes", code: "latex" })); }
  yield* io(() => readFile(source));
  yield* io(() => mkdir(output, { recursive: true }));
  const command = engine === "tectonic" ? [engine, "-o", output, resolve(source)]
    : [engine, "-no-shell-escape", "-halt-on-error", "-interaction=nonstopmode", `-output-directory=${output}`, resolve(source)];
  yield* Effect.forEach(engine === "tectonic" ? [1] : [1, 2], () => Effect.acquireUseRelease(
    attempt(() => Bun.spawn(command, { cwd: ROOT, stdout: "inherit", stderr: "inherit" }), "latex"),
    process => io(() => process.exited, "latex").pipe(Effect.flatMap(code => code ? Effect.fail(new AppError({ message: `LaTeX compilation failed (${code})`, code: "latex" })) : Effect.void)),
    process => Effect.sync(() => { if (process.exitCode === null) { process.kill(); } }),
  ));
  return join(output, basename(source, ".tex") + ".pdf");
});

const main = Effect.gen(function* () {
  const [command, ...files] = Bun.argv.slice(2);
  if (command === "check") {
    yield* Effect.forEach(files.length ? files : PEOPLE.map(p => join(ROOT, "dist", profiles[p].pdf)), path => checkPDF(path));
  } else if (command === "compile" && files[0]) {
    yield* Effect.log(yield* compile(files[0]));
  } else if (command === "build") {
    const candidates = files[0] ? [yield* person(files[0])] : PEOPLE;
    yield* Effect.forEach(candidates, candidate => Effect.gen(function* () {
      const pdf = yield* compile(join(ROOT, profiles[candidate].resume), join(ROOT, "dist"));
      const target = join(ROOT, "dist", profiles[candidate].pdf);
      yield* io(() => copyFile(pdf, target));
      yield* checkPDF(target);
    }));
  } else { yield* Effect.fail(new AppError({ message: "Use bun scripts/resumes.ts build | check [pdf…] | compile <source.tex>", code: "validation" })); }
});

if (import.meta.main) { Effect.runPromise(main.pipe(Effect.catch(error => Effect.gen(function* () { yield* Effect.logError(error.message); yield* Effect.sync(() => { process.exitCode = 1; }); })))); }
