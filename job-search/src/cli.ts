import { parseArgs } from "node:util";
import { Effect } from "effect";
import { Store, PEOPLE, person } from "./store";
import { serve } from "./server";
import { AppError, attempt, io } from "./errors";

const store = new Store();
export const main = Effect.gen(function* () {
  const { values, positionals } = yield* attempt(() => parseArgs({ args: Bun.argv.slice(2), allowPositionals: true,
    options: { agent: { type: "string", default: "opencode" }, port: { type: "string", default: "8765" }, file: { type: "string" }, status: { type: "string" }, notes: { type: "string" } } }));
  const [command = "help", selected, applicationId] = positionals;
  if (command === "serve" || command === "init") {
    const candidates = selected && selected !== "all" ? [yield* person(selected)] : PEOPLE;
    yield* Effect.forEach(candidates, candidate => store.initialize(candidate).pipe(Effect.flatMap(path => Effect.log(`${candidate}: ${path}`))));
    if (command === "serve") {
      yield* Effect.scoped(Effect.gen(function* () {
        const server = yield* serve(store, Number(values.port));
        yield* Effect.log(`Job search: http://127.0.0.1:${server.port}`);
        yield* Effect.never;
      }));
    }
  } else if (command === "launch") {
    const path = yield* store.initialize(yield* person(selected));
    const executable = yield* attempt(() => {
      const agent = values.agent ?? "opencode";
      if (!["opencode", "claude", "codex"].includes(agent)) { throw new Error("Choose opencode, claude or codex"); }
      const executable = Bun.which(agent);
      if (!executable) { throw new Error(`${agent} is not installed or on PATH`); }
      return executable;
    });
    const exitCode = yield* Effect.acquireUseRelease(
      Effect.sync(() => Bun.spawn([executable], { cwd: path, stdin: "inherit", stdout: "inherit", stderr: "inherit" })),
      process => io(() => process.exited, "process"),
      process => Effect.sync(() => { if (process.exitCode === null) { process.kill(); } }),
    );
    yield* Effect.sync(() => { process.exitCode = exitCode; });
  } else if (command === "list") {
    yield* Effect.log(JSON.stringify(yield* store.read(yield* person(selected)), null, 2));
  } else if (command === "save") {
    if (!values.file) { return yield* Effect.fail(new AppError({ message: "Use save <person> --file <application.json>", code: "validation" })); }
    const file = values.file;
    const input = yield* io(() => Bun.file(file).json());
    yield* Effect.log(JSON.stringify(yield* store.saveApplication(yield* person(selected), input), null, 2));
  } else if (command === "status") {
    const candidate = yield* person(selected), state = yield* store.read(candidate);
    const row = state.applications.find(row => row.id === applicationId);
    if (!row || !values.status) { return yield* Effect.fail(new AppError({ message: "Use status <person> <id> --status <status> [--notes <text>]", code: "validation" })); }
    yield* Effect.log(JSON.stringify(yield* store.saveApplication(candidate, { ...row, status: values.status, notes: values.notes ?? row.notes }), null, 2));
  } else if (command === "prepare") {
    if (!applicationId) { return yield* Effect.fail(new AppError({ message: "Provide an application ID", code: "validation" })); }
    yield* Effect.log(yield* store.prepare(yield* person(selected), applicationId));
  } else if (command === "doctor") {
    yield* Effect.forEach(["bun", "opencode", "claude", "codex", "xelatex", "lualatex", "tectonic"], tool => Effect.sync(() => Bun.which(tool)).pipe(Effect.flatMap(path => Effect.log(`${tool}: ${path ?? "not installed"}`))));
  } else {
    yield* Effect.log("bun run dev · development\nbun run build && bun start · production\nbun run job-search init <laxman|sraya|all>\nlaunch <person> [--agent opencode]\nlist <person>\nsave <person> --file application.json\nstatus <person> <id> --status interview\nprepare <person> <id>\ndoctor");
  }
});

if (import.meta.main) {
  Effect.runPromise(main.pipe(Effect.catch(error => Effect.gen(function* () { yield* Effect.logError(error.message); yield* Effect.sync(() => { process.exitCode = 1; }); }))));
}
