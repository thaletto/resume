import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";
import { Job, Person, Section, Snapshot, Status } from "./model";

// MESSAGE
export const Message = defineMessageUnion({
  Loaded: { snapshot: Snapshot }, Refreshed: {}, Failed: { error: Schema.String },
  SelectedPerson: { person: Person }, SelectedSection: { section: Section },
  ChangedDraft: { field: Schema.Literals(["id", "company", "role", "date", "deadline", "source", "location", "posting", "notes"]), value: Schema.String },
  SelectedStatus: { status: Status },
  ChangedPreference: { field: Schema.Literals(["roles", "location", "constraints", "languages", "salary"]), value: Schema.String },
  ChangedSearch: { field: Schema.Literals(["query", "country", "remote", "search", "filter"]), value: Schema.String },
  NewApplication: {}, EditApplication: { id: Schema.String }, CancelEdit: {}, SubmitApplication: {}, SubmitPreferences: {},
  Saved: { snapshot: Snapshot, person: Person, notice: Schema.String }, SearchJobs: {}, FoundJobs: { jobs: Schema.Array(Job), person: Person },
  SaveJob: { index: Schema.Number }, Prepare: { id: Schema.String }, Prepared: { path: Schema.String, person: Person },
  ToggleTheme: {}, ThemeApplied: {},
});
export type Message = typeof Message.Type;
