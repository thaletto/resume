import { Effect, Schema } from "effect";
import { AppError, attempt, io } from "./errors.ts";
import { validURL } from "./store.ts";

export const Job = Schema.Struct({ company: Schema.String, role: Schema.String, source: Schema.String, location: Schema.String, posting: Schema.String });
export type Job = typeof Job.Type;
const Result = Schema.Struct({ title: Schema.String, company: Schema.String, url: Schema.String, location: Schema.optional(Schema.String), description: Schema.optional(Schema.String) });

export const discover = Effect.fn("discoverJobs")(function* (query: string, country: string, remote: string) {
  const url = yield* attempt(() => {
    if (!query.trim() || query.length > 250) { throw new Error("Enter a job title or skill to search"); }
    if (country && !/^[A-Za-z]{2}$/.test(country)) { throw new Error("Country must be a two-letter code, such as IN"); }
    if (remote && !["remote", "hybrid", "onsite"].includes(remote)) { throw new Error("Choose a valid work mode"); }
    const url = new URL("https://freehire.me/api/v1/agent/jobs/search");
    url.searchParams.set("q", query); url.searchParams.set("limit", "20"); url.searchParams.set("description_format", "text");
    if (country) { url.searchParams.set("countries", country.toUpperCase()); }
    if (remote) { url.searchParams.set("work_mode", remote); }
    return url;
  });
  const response = yield* io(signal => fetch(url, { headers: { Accept: "application/json", "User-Agent": "thaletto/resume-job-search/1.0" }, signal }), "network").pipe(Effect.timeout("20 seconds"), Effect.mapError(error => error instanceof AppError ? error : new AppError({ message: "Job source timed out; try again later", code: "network" })));
  if (!response.ok) { return yield* Effect.fail(new AppError({ message: `Job source returned ${response.status}; try again later or add a posting manually`, code: "network" })); }
  const body = yield* io(() => response.json(), "network");
  const envelope = yield* Schema.decodeUnknownEffect(Schema.Struct({ data: Schema.Array(Schema.Unknown) }))(body).pipe(Effect.mapError(() => new AppError({ message: "Job source returned an unexpected response", code: "network" })));
  const rows = yield* Effect.forEach(envelope.data, item => Schema.decodeUnknownEffect(Result)(item).pipe(Effect.flatMap(row => attempt(() => ({ company: row.company, role: row.title, source: validURL(row.url), location: row.location ?? "", posting: row.description ?? "" }))), Effect.catch(() => Effect.succeed(undefined))));
  return rows.filter((row): row is Job => row !== undefined);
});
