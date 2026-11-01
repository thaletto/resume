import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { Draft, Job, Person, PreferenceDraft, Snapshot } from "./model";
import { Message } from "./message";

const request = (path: string, body?: unknown) => Effect.tryPromise(async signal => {
  const response = await fetch(path, { signal, ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  const value: unknown = result;
  return value;
}).pipe(Effect.timeout("30 seconds"));
const snapshot = () => request("/api/state").pipe(Effect.flatMap(Schema.decodeUnknownEffect(Snapshot)));
const failed = (error: unknown) => Effect.succeed(Message.Failed({ error: error instanceof Error ? error.message : "Could not complete the request. Try again." }));

export const Load = Command.define("Load", { messages: [Message.Loaded, Message.Failed], execute: snapshot().pipe(Effect.map(snapshot => Message.Loaded({ snapshot })), Effect.catch(failed)) });
export const SaveApplication = Command.define("SaveApplication", {
  args: { person: Person, draft: Draft }, messages: [Message.Saved, Message.Failed],
  execute: ({ person, draft }) => Effect.gen(function* () {
    const { id, ...fields } = draft;
    yield* request("/api/applications", { person, application: { ...fields, ...(id ? { id } : {}) } });
    return Message.Saved({ person, snapshot: yield* snapshot(), notice: "Application saved." });
  }).pipe(Effect.catch(failed)),
});
export const SavePreferences = Command.define("SavePreferences", {
  args: { person: Person, preferences: PreferenceDraft }, messages: [Message.Saved, Message.Failed],
  execute: ({ person, preferences }) => Effect.gen(function* () {
    yield* request("/api/preferences", { person, preferences: { ...preferences, roles: preferences.roles.split("\n").map(role => role.trim()).filter(Boolean) } });
    return Message.Saved({ person, snapshot: yield* snapshot(), notice: "Preferences saved to your local workspace." });
  }).pipe(Effect.catch(failed)),
});
export const Search = Command.define("Search", {
  args: { person: Person, query: Schema.String, country: Schema.String, remote: Schema.String }, messages: [Message.FoundJobs, Message.Failed],
  execute: args => request("/api/discover", args).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ jobs: Schema.Array(Job) }))), Effect.map(({ jobs }) => Message.FoundJobs({ jobs, person: args.person })), Effect.catch(failed)),
});
export const Prepare = Command.define("Prepare", {
  args: { person: Person, id: Schema.String }, messages: [Message.Prepared, Message.Failed],
  execute: args => request("/api/prepare", args).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ path: Schema.String }))), Effect.map(({ path }) => Message.Prepared({ path, person: args.person })), Effect.catch(failed)),
});
export const ApplyTheme = Command.define("ApplyTheme", {
  args: { dark: Schema.Boolean }, messages: [Message.ThemeApplied],
  execute: ({ dark }) => Effect.sync(() => { document.documentElement.classList.toggle("dark", dark); try { localStorage.setItem("job-search-theme", dark ? "dark" : "light"); } catch {} return Message.ThemeApplied(); }),
});
