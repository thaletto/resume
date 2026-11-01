import type { Runtime, Update } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { ApplyTheme, Load, Prepare, SaveApplication, SavePreferences, Search } from "./commands";
import { Model, blankDraft, emptySnapshot, preferenceDraft } from "./model";
import { Message } from "./message";
export { Model } from "./model";
export { Message } from "./message";
export { view } from "./view";

// INIT
export const init: Runtime.ApplicationInit<Model, Message> = () => {
  const snapshot = emptySnapshot();
  return { model: { person: "laxman", section: "applications", snapshot, draft: blankDraft(), preferences: preferenceDraft(snapshot, "laxman"), query: "", country: "", remote: "", search: "", filter: "", jobs: [], loading: true, busy: false, notice: "", error: "", editing: false, dark: false }, commands: [Load()] };
};

// UPDATE
export const update = (model: Model, message: Message) => Message.match<Update.Return<Model, Message>>(message, {
  Loaded: ({ snapshot }) => ({ model: modifyFields(model, { snapshot: () => snapshot, preferences: () => preferenceDraft(snapshot, model.person), loading: () => false, error: () => "" }) }),
  Refreshed: () => ({ model: modifyFields(model, { loading: () => true, error: () => "" }), commands: [Load()] }),
  Failed: ({ error }) => ({ model: modifyFields(model, { busy: () => false, loading: () => false, error: () => error }) }),
  SelectedPerson: ({ person }) => ({ model: modifyFields(model, { person: () => person, draft: blankDraft, preferences: () => preferenceDraft(model.snapshot, person), jobs: () => [], editing: () => false, notice: () => "", error: () => "", search: () => "", filter: () => "" }) }),
  SelectedSection: ({ section }) => ({ model: modifyFields(model, { section: () => section, notice: () => "", error: () => "" }) }),
  ChangedDraft: ({ field, value }) => ({ model: modifyFields(model, { draft: draft => modifyFields(draft, { id: old => field === "id" ? value : old, company: old => field === "company" ? value : old, role: old => field === "role" ? value : old, date: old => field === "date" ? value : old, deadline: old => field === "deadline" ? value : old, source: old => field === "source" ? value : old, location: old => field === "location" ? value : old, posting: old => field === "posting" ? value : old, notes: old => field === "notes" ? value : old }) }) }),
  SelectedStatus: ({ status }) => ({ model: modifyFields(model, { draft: draft => modifyFields(draft, { status: () => status }) }) }),
  ChangedPreference: ({ field, value }) => ({ model: modifyFields(model, { preferences: preferences => modifyFields(preferences, { roles: old => field === "roles" ? value : old, location: old => field === "location" ? value : old, constraints: old => field === "constraints" ? value : old, languages: old => field === "languages" ? value : old, salary: old => field === "salary" ? value : old }) }) }),
  ChangedSearch: ({ field, value }) => ({ model: modifyFields(model, { query: old => field === "query" ? value : old, country: old => field === "country" ? value : old, remote: old => field === "remote" ? value : old, search: old => field === "search" ? value : old, filter: old => field === "filter" ? value : old }) }),
  NewApplication: () => ({ model: modifyFields(model, { section: () => "applications", editing: () => true, draft: blankDraft, error: () => "", notice: () => "" }) }),
  EditApplication: ({ id }) => {
    const row = model.snapshot.applications[model.person].find(row => row.id === id);
    return { model: row ? modifyFields(model, { draft: () => row, editing: () => true, error: () => "", notice: () => "" }) : model };
  },
  CancelEdit: () => ({ model: modifyFields(model, { editing: () => false, draft: blankDraft }) }),
  SubmitApplication: () => model.busy ? { model } : ({ model: modifyFields(model, { busy: () => true, error: () => "" }), commands: [SaveApplication({ person: model.person, draft: model.draft })] }),
  SubmitPreferences: () => model.busy ? { model } : ({ model: modifyFields(model, { busy: () => true, error: () => "" }), commands: [SavePreferences({ person: model.person, preferences: model.preferences })] }),
  Saved: ({ snapshot, person, notice }) => {
    const next = modifyFields(model, { snapshot: () => snapshot, busy: () => false });
    return { model: person === model.person ? modifyFields(next, { notice: () => notice, editing: () => false, draft: blankDraft, preferences: () => preferenceDraft(snapshot, person) }) : next };
  },
  SearchJobs: () => model.busy ? { model } : ({ model: modifyFields(model, { busy: () => true, jobs: () => [], error: () => "", notice: () => "" }), commands: [Search({ person: model.person, query: model.query, country: model.country, remote: model.remote })] }),
  FoundJobs: ({ jobs, person }) => {
    const next = modifyFields(model, { busy: () => false });
    return { model: person === model.person ? modifyFields(next, { jobs: () => jobs, notice: () => jobs.length ? `${jobs.length} jobs found.` : "No results. Try a broader search." }) : next };
  },
  SaveJob: ({ index }) => {
    const job = model.jobs[index];
    return !job || model.busy ? { model } : { model: modifyFields(model, { busy: () => true, error: () => "" }), commands: [SaveApplication({ person: model.person, draft: modifyFields(blankDraft(), { company: () => job.company, role: () => job.role, source: () => job.source, location: () => job.location, posting: () => job.posting }) })] };
  },
  Prepare: ({ id }) => model.busy ? { model } : ({ model: modifyFields(model, { busy: () => true, error: () => "" }), commands: [Prepare({ person: model.person, id })] }),
  Prepared: ({ path, person }) => ({ model: modifyFields(model, { busy: () => false, notice: notice => person === model.person ? `Draft folder ready: ${path}` : notice }) }),
  ToggleTheme: () => ({ model: modifyFields(model, { dark: dark => !dark }), commands: [ApplyTheme({ dark: !model.dark })] }),
  ThemeApplied: () => ({ model }),
});
