import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Clock, Effect, Schema, Semaphore } from "effect";
import profiles from "../profiles.json" with { type: "json" };
import { AppError, attempt, io } from "./errors.ts";

export const ROOT = resolve(import.meta.dir, "../..");
export const PEOPLE = ["laxman", "sraya"] as const;
export const Person = Schema.Literals(PEOPLE);
export type Person = typeof Person.Type;
export const STATUSES = ["saved", "drafted", "applied", "interview", "offer", "hired", "rejected", "no_response", "offer_declined", "withdrawn"] as const;
export const Status = Schema.Literals(STATUSES);
export type Status = typeof Status.Type;
export const Event = Schema.Struct({ status: Status, date: Schema.String, notes: Schema.String });
export const Application = Schema.Struct({
  id: Schema.String, company: Schema.String, role: Schema.String, status: Status,
  date: Schema.String, deadline: Schema.String, source: Schema.String, notes: Schema.String,
  posting: Schema.String, location: Schema.String,
  history: Schema.Array(Event), createdAt: Schema.String, updatedAt: Schema.String,
});
export type Application = typeof Application.Type;
export const Preferences = Schema.Struct({ roles: Schema.Array(Schema.String), location: Schema.String, constraints: Schema.String, languages: Schema.String, salary: Schema.String });
export type Preferences = typeof Preferences.Type;
export const State = Schema.Struct({ version: Schema.Literal(1), preferences: Preferences, applications: Schema.Array(Application) });
export type State = typeof State.Type;

export const person = (value: unknown) => Schema.decodeUnknownEffect(Person)(value).pipe(Effect.mapError(() => new AppError({ message: "Choose Laxman or Sraya", code: "validation" })));
export function validURL(value: string): string {
  if (!value) { return ""; }
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) { throw new Error("Posting URL must use http or https"); }
  return url.href;
}
function text(value: unknown, field: string, limit = 20000): string {
  if (typeof value !== "string" || value.length > limit) { throw new Error(`Invalid ${field}`); }
  return value.trim();
}
function date(value: unknown, field: string): string {
  const result = text(value, field, 10);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(result).toISOString().slice(0, 10) !== result)) { throw new Error(`${field} must be a valid YYYY-MM-DD date`); }
  return result;
}
const emptyState = (): State => ({ version: 1, preferences: { roles: [], location: "", constraints: "", languages: "", salary: "" }, applications: [] });
const readOptional = (path: string) => Effect.tryPromise({ try: () => readFile(path, "utf8"), catch: cause => cause }).pipe(Effect.catch(cause => {
  if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") { return Effect.succeed(undefined); }
  return Effect.fail(new AppError({ message: cause instanceof Error ? cause.message : "Cannot read workspace", code: "storage" }));
}));

export class Store {
  private locks = { laxman: Semaphore.makeUnsafe(1), sraya: Semaphore.makeUnsafe(1) };
  constructor(readonly directory = join(ROOT, "job-search/workspaces")) {}
  path(candidate: Person) { return join(this.directory, candidate); }

  read = Effect.fn("Store.read")(function* (this: Store, candidate: Person) {
    yield* person(candidate);
    const contents = yield* readOptional(join(this.path(candidate), "state.json"));
    if (contents === undefined) { return emptyState(); }
    const value = yield* attempt(() => JSON.parse(contents), "storage");
    return yield* Schema.decodeUnknownEffect(State)(value).pipe(Effect.mapError(cause => new AppError({ message: `Invalid workspace data: ${cause.message}`, code: "storage" })));
  });

  private save = Effect.fn("Store.save")(function* (this: Store, candidate: Person, state: State) {
    const path = this.path(candidate);
    yield* io(() => mkdir(path, { recursive: true }));
    const id = yield* Effect.sync(randomUUID);
    const temporary = join(path, `${id}.tmp`);
    yield* Effect.acquireUseRelease(
      io(() => writeFile(temporary, JSON.stringify(state, null, 2) + "\n", "utf8")).pipe(Effect.as(temporary)),
      temporary => io(() => rename(temporary, join(path, "state.json"))),
      temporary => io(() => unlink(temporary)).pipe(Effect.catch(() => Effect.void)),
    );
  });

  initialize(candidate: Person) {
    return person(candidate).pipe(Effect.flatMap(candidate => this.locks[candidate].withPermit(Effect.gen({ self: this }, function* () {
      const path = this.path(candidate);
      yield* io(() => mkdir(join(path, "applications"), { recursive: true }));
      if ((yield* readOptional(join(path, "master.tex"))) === undefined) { yield* io(() => copyFile(join(ROOT, profiles[candidate].resume), join(path, "master.tex"))); }
      yield* Effect.forEach(["AGENTS.md", "CLAUDE.md"], file => Effect.gen(function* () {
        const target = join(path, file);
        if ((yield* readOptional(target)) === undefined) {
          yield* io(() => writeFile(target, `# Job search: ${profiles[candidate].name}\n\nThis workspace belongs only to ${candidate}.\nRead master.tex for verified resume evidence. Read ../../../job-search/WORKFLOWS.md for the workflow.\nKeep all drafts and research under applications/<application-id>/.\nUse the repository CLI to update state.json; do not overwrite it directly.\nFrom this directory: bun ../../src/cli.ts list ${candidate}\nAll preferences in state.json are candidate-provided; blank fields are unknown.\nNever combine sibling candidate evidence, fabricate experience, or mark an application submitted without confirmation.\n`, "utf8"));
        }
      }));
      if ((yield* readOptional(join(path, "state.json"))) === undefined) { yield* this.save(candidate, emptyState()); }
      else { yield* this.read(candidate); }
      return path;
    }))));
  }

  saveApplication(candidate: Person, input: Record<string, unknown>) {
    return person(candidate).pipe(Effect.flatMap(candidate => this.locks[candidate].withPermit(Effect.gen({ self: this }, function* () {
      const state = yield* this.read(candidate);
      const now = new Date(yield* Clock.currentTimeMillis).toISOString();
      const newId = yield* Effect.sync(randomUUID);
      const row = yield* attempt((): Application => {
        if (!input || typeof input !== "object" || Array.isArray(input)) { throw new Error("Provide an application object"); }
        const id = input.id === undefined ? "" : text(input.id, "application ID", 64);
        const existing = id ? state.applications.find(row => row.id === id) : undefined;
        if (id && !existing) { throw new Error("Application not found in this candidate's workspace"); }
        const company = text(input.company, "company", 250), role = text(input.role, "role", 250);
        if (!company || !role) { throw new Error("Company and role are required"); }
        const status = Schema.decodeUnknownSync(Status)(input.status);
        const source = validURL(text(input.source ?? existing?.source ?? "", "source", 2000));
        if (source && state.applications.some(row => row.id !== existing?.id && row.source === source)) { throw new Error("This posting is already saved; edit the existing application"); }
        const notes = text(input.notes ?? existing?.notes ?? "", "notes");
        return { id: existing?.id ?? newId, company, role, status,
          date: date(input.date ?? existing?.date ?? "", "Date"), deadline: date(input.deadline ?? existing?.deadline ?? "", "Deadline"), source, notes,
          posting: text(input.posting ?? existing?.posting ?? "", "posting", 100000), location: text(input.location ?? existing?.location ?? "", "location", 250),
          history: !existing || existing.status !== status ? [...(existing?.history ?? []), { status, date: now, notes }] : existing.history,
          createdAt: existing?.createdAt ?? now, updatedAt: now };
      });
      const applications = state.applications.some(old => old.id === row.id) ? state.applications.map(old => old.id === row.id ? row : old) : [...state.applications, row];
      yield* this.save(candidate, { ...state, applications });
      return row;
    }))));
  }

  savePreferences(candidate: Person, input: Record<string, unknown>) {
    return person(candidate).pipe(Effect.flatMap(candidate => this.locks[candidate].withPermit(Effect.gen({ self: this }, function* () {
      const state = yield* this.read(candidate);
      const preferences = yield* attempt(() => {
        if (!input || !Array.isArray(input.roles) || input.roles.length > 20) { throw new Error("Provide up to 20 target roles"); }
        return { roles: input.roles.map(role => text(role, "target role", 250)).filter(Boolean), location: text(input.location, "location", 250), constraints: text(input.constraints, "constraints"), languages: text(input.languages, "languages", 2000), salary: text(input.salary, "salary", 1000) };
      });
      yield* this.save(candidate, { ...state, preferences });
      return preferences;
    }))));
  }

  prepare = Effect.fn("Store.prepare")(function* (this: Store, candidate: Person, id: string) {
    const state = yield* this.read(candidate);
    const row = state.applications.find(app => app.id === id);
    if (!row) { return yield* Effect.fail(new AppError({ message: "Application not found", code: "validation" })); }
    const path = join(this.path(candidate), "applications", row.id);
    yield* io(() => mkdir(path, { recursive: true }));
    const files = {
      "posting.md": `# ${row.company}: ${row.role}\n\nSource: ${row.source || "Not provided"}\n\n${row.posting || "Paste the complete job description here before evaluating fit."}\n`,
      "brief.md": `# Application brief\n\nCandidate: ${profiles[candidate].name}\nRole: ${row.role}\nCompany: ${row.company}\n\nUse ../../master.tex as evidence and ../../state.json for confirmed preferences.\nFollow ../../../../../job-search/WORKFLOWS.md.\nWrite evaluation.md first, then cv.tex, cover-letter.tex, review.md and interview.md as needed.\n`,
    };
    yield* Effect.forEach(Object.entries(files), ([file, contents]) => Effect.gen(function* () {
      if ((yield* readOptional(join(path, file))) === undefined) { yield* io(() => writeFile(join(path, file), contents, "utf8")); }
    }));
    return path;
  });
}
export { profiles };
