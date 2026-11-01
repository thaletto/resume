import { Store, PEOPLE, person, profiles, STATUSES } from "./store.ts";
import { discover } from "./discovery.ts";
import { join, resolve, extname } from "node:path";
import { ROOT } from "./store.ts";
import { Effect } from "effect";
import { attempt, io } from "./errors.ts";

const defaultStore = new Store();

export const handleAPI = (request: Request, store = defaultStore) => Effect.gen(function* () {
  const url = new URL(request.url);
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || request.headers.get("host") !== url.host) return json({ error: "Use the printed loopback URL" }, 403);
    if (request.method === "GET" && url.pathname === "/api/state") {
      yield* Effect.forEach(PEOPLE, candidate => store.initialize(candidate));
      const entries = yield* Effect.forEach(PEOPLE, candidate => store.read(candidate).pipe(Effect.map(state => [candidate, state] as const)));
      const states = Object.fromEntries(entries);
      return json({ profiles, statuses: STATUSES, applications: Object.fromEntries(PEOPLE.map(p => [p, states[p].applications])), preferences: Object.fromEntries(PEOPLE.map(p => [p, states[p].preferences])) });
    }
    if (request.method !== "POST" || !["/api/applications", "/api/preferences", "/api/discover", "/api/prepare"].includes(url.pathname)) return json({ error: "Not found" }, 404);
    if (request.headers.get("origin") !== url.origin || request.headers.get("content-type") !== "application/json") return json({ error: "Use the local dashboard" }, 403);
    const body = yield* io(() => request.text(), "request");
    if (body.length > 150000) return json({ error: "Request is too large" }, 413);
    const data = yield* attempt(() => {
      const value = JSON.parse(body);
      if (!value || typeof value !== "object" || Array.isArray(value)) { throw new Error("Provide a request object"); }
      return value;
    });
    const candidate = yield* person(data.person);
    if (url.pathname === "/api/applications") return json({ application: yield* store.saveApplication(candidate, data.application) });
    if (url.pathname === "/api/preferences") return json({ preferences: yield* store.savePreferences(candidate, data.preferences) });
    if (url.pathname === "/api/prepare") return json({ path: yield* store.prepare(candidate, data.id) });
    return json({ jobs: yield* discover(String(data.query ?? ""), String(data.country ?? ""), String(data.remote ?? "")) });
}).pipe(Effect.catch(error => Effect.succeed(Response.json({ error: error.message }, { status: error.code === "storage" ? 500 : 400 }))));

export function startServer(store = new Store(), port = 8765) {
  return Bun.serve({
    hostname: "127.0.0.1", port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return Effect.runPromise(handleAPI(request, store));
      const root = resolve(ROOT, "dist/app");
      const path = resolve(root, `.${url.pathname}`);
      if (!path.startsWith(root + "/") && !path.startsWith(root + "\\") && path !== root) return new Response("Not found", { status: 404 });
      const file = Bun.file(url.pathname === "/" ? join(root, "index.html") : path);
      if (!(await file.exists()) || (!extname(path) && url.pathname !== "/")) return new Response("Not found; run bun run build first", { status: 404 });
      return new Response(file);
    },
  });
}

export const serve = (store = new Store(), port = 8765) => Effect.acquireRelease(
  attempt(() => startServer(store, port), "server"),
  server => Effect.sync(() => server.stop(true)),
);
