import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { startServer } from "../src/server.ts";
import { Effect } from "effect";

let directory: string, store: Store;
let server: ReturnType<typeof startServer> | undefined;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "resume-test-")); store = new Store(directory); });
afterEach(async () => { server?.stop(true); server = undefined; await rm(directory, { recursive: true, force: true }); });

test("candidate initialization preserves evidence and confirmed preferences", async () => {
  await Effect.runPromise(store.initialize("laxman")); await Effect.runPromise(store.initialize("sraya"));
  const evidence = Bun.file(join(directory, "sraya/master.tex"));
  expect(await evidence.text()).toContain("Sraya Rajan");
  expect(await evidence.text()).not.toContain("Laxman K R");
  await Bun.write(evidence, "Candidate-confirmed evidence");
  await Effect.runPromise(store.savePreferences("sraya", { roles: ["Backend Engineer"], location: "Remote", languages: "English", salary: "", constraints: "" }));
  await Effect.runPromise(store.initialize("sraya"));
  expect(await evidence.text()).toBe("Candidate-confirmed evidence");
  expect((await Effect.runPromise(store.read("sraya"))).preferences.location).toBe("Remote");
  expect((await Effect.runPromise(store.read("laxman"))).preferences.roles).toEqual([]);
});

test("application identity, status history and draft folders preserve candidate work", async () => {
  const first = await Effect.runPromise(store.saveApplication("laxman", { company: "Company", role: "Engineer", status: "saved", source: "https://example.com/jobs/1", posting: "Full requirements" }));
  const second = await Effect.runPromise(store.saveApplication("laxman", { company: "Company", role: "Engineer", status: "saved", source: "https://example.com/jobs/2" }));
  expect(first.id).not.toBe(second.id);
  await expect(Effect.runPromise(store.saveApplication("laxman", { company: "Company", role: "Engineer", status: "saved", source: first.source }))).rejects.toThrow("already saved");
  await Effect.runPromise(store.saveApplication("laxman", { id: first.id, company: first.company, role: first.role, status: "interview", notes: "Technical round" }));
  const final = await Effect.runPromise(store.saveApplication("laxman", { id: first.id, company: first.company, role: first.role, status: "rejected", notes: "After interview" }));
  expect(final.history.map(event => event.status)).toEqual(["saved", "interview", "rejected"]);
  expect(final.posting).toBe("Full requirements");
  await expect(Effect.runPromise(store.saveApplication("sraya", { ...first, status: "interview" }))).rejects.toThrow("not found");
  expect((await Effect.runPromise(store.read("sraya"))).applications).toEqual([]);
  const path = await Effect.runPromise(store.prepare("laxman", first.id));
  await Bun.write(join(path, "posting.md"), "Edited posting");
  await Effect.runPromise(store.prepare("laxman", first.id));
  expect(await Bun.file(join(path, "posting.md")).text()).toBe("Edited posting");
});

test("HTTP boundary persists valid edits and rejects cross-origin or invalid input", async () => {
  server = startServer(store, 0);
  const origin = `http://127.0.0.1:${server.port}`;
  const post = (body: unknown, requestOrigin = origin) => fetch(`${origin}/api/applications`, { method: "POST", headers: { "Content-Type": "application/json", Origin: requestOrigin }, body: JSON.stringify(body) });
  const application = { company: 'Company, "Research"', role: "Engineer", status: "drafted", notes: "<script>data only</script>\nSecond line" };
  expect((await post({ person: "laxman", application }, "https://example.com")).status).toBe(403);
  for (const change of [{ status: "invented" }, { company: "" }, { date: "2026-02-30" }, { source: "javascript:alert(1)" }]) {
    expect((await post({ person: "laxman", application: { ...application, ...change } })).status).toBe(400);
  }
  expect((await post({ person: "../sraya", application })).status).toBe(400);
  expect((await post({ person: "laxman", application })).status).toBe(200);
  const data = await (await fetch(`${origin}/api/state`)).json();
  expect(data.applications.laxman[0].notes).toBe(application.notes);
  expect(data.applications.sraya).toEqual([]);
  expect((await fetch(`${origin}/workspaces/laxman/state.json`)).status).toBe(404);
  const preferences = { roles: ["Backend Engineer"], location: "Remote", languages: "English", salary: "", constraints: "No on-call" };
  const response = await fetch(`${origin}/api/preferences`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ person: "sraya", preferences }) });
  expect(response.status).toBe(200);
  const reopened = new Store(directory);
  expect((await Effect.runPromise(reopened.read("sraya"))).preferences).toEqual(preferences);
  expect((await Effect.runPromise(reopened.read("laxman"))).preferences.location).toBe("");
});

test("concurrent server-side saves do not drop applications", async () => {
  await Effect.runPromise(Effect.all(Array.from({ length: 10 }, (_, index) => store.saveApplication("sraya", { company: `Company ${index}`, role: "Engineer", status: "saved" })), { concurrency: "unbounded" }));
  expect((await Effect.runPromise(store.read("sraya"))).applications).toHaveLength(10);
});
