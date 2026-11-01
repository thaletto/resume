import { Schema } from "effect";

export const Person = Schema.Literals(["laxman", "sraya"]);
export const Status = Schema.Literals(["saved", "drafted", "applied", "interview", "offer", "hired", "rejected", "no_response", "offer_declined", "withdrawn"]);
export const Application = Schema.Struct({
  id: Schema.String, company: Schema.String, role: Schema.String, status: Status,
  date: Schema.String, deadline: Schema.String, source: Schema.String, notes: Schema.String,
  posting: Schema.String, location: Schema.String, createdAt: Schema.String, updatedAt: Schema.String,
  history: Schema.Array(Schema.Struct({ status: Status, date: Schema.String, notes: Schema.String })),
});
export const Preferences = Schema.Struct({ roles: Schema.Array(Schema.String), location: Schema.String, constraints: Schema.String, languages: Schema.String, salary: Schema.String });
export const Snapshot = Schema.Struct({
  applications: Schema.Struct({ laxman: Schema.Array(Application), sraya: Schema.Array(Application) }),
  preferences: Schema.Struct({ laxman: Preferences, sraya: Preferences }),
});
export const Draft = Schema.Struct({ id: Schema.String, company: Schema.String, role: Schema.String, status: Status, date: Schema.String, deadline: Schema.String, source: Schema.String, location: Schema.String, posting: Schema.String, notes: Schema.String });
export const PreferenceDraft = Schema.Struct({ roles: Schema.String, location: Schema.String, constraints: Schema.String, languages: Schema.String, salary: Schema.String });
export const Job = Schema.Struct({ company: Schema.String, role: Schema.String, source: Schema.String, location: Schema.String, posting: Schema.String });
export const Section = Schema.Literals(["applications", "discover", "preferences"]);
export const Model = Schema.Struct({
  person: Person, section: Section, snapshot: Snapshot, draft: Draft, preferences: PreferenceDraft,
  query: Schema.String, country: Schema.String, remote: Schema.String, search: Schema.String, filter: Schema.String,
  jobs: Schema.Array(Job), loading: Schema.Boolean, busy: Schema.Boolean, notice: Schema.String,
  error: Schema.String, editing: Schema.Boolean, dark: Schema.Boolean,
});
export type Model = typeof Model.Type;
export type Draft = typeof Draft.Type;
export type Application = typeof Application.Type;
export const blankPreferences = () => ({ roles: [], location: "", constraints: "", languages: "", salary: "" });
export const emptySnapshot = () => ({ applications: { laxman: [], sraya: [] }, preferences: { laxman: blankPreferences(), sraya: blankPreferences() } });
export const blankDraft = (): Draft => ({ id: "", company: "", role: "", status: "saved", date: "", deadline: "", source: "", location: "", posting: "", notes: "" });
export function preferenceDraft(snapshot: typeof Snapshot.Type, person: typeof Person.Type) {
  const preferences = snapshot.preferences[person];
  return { ...preferences, roles: preferences.roles.join("\n") };
}
