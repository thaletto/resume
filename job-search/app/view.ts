import { Button, Input } from "@foldkit/ui";
import type { Document, Html, HtmlBuilder } from "foldkit/html";
import { type Draft, type Model } from "./model";
import { Message } from "./message";

const labels: Record<string, string> = { saved: "Saved", drafted: "Drafted", applied: "Applied", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected", no_response: "No response", offer_declined: "Offer declined", withdrawn: "Withdrawn" };
const statuses: ReadonlyArray<Draft["status"]> = ["saved", "drafted", "applied", "interview", "offer", "hired", "rejected", "no_response", "offer_declined", "withdrawn"];
const candidates: ReadonlyArray<Model["person"]> = ["laxman", "sraya"];
const sections: ReadonlyArray<Model["section"]> = ["applications", "discover", "preferences"];
type H = HtmlBuilder<Message>;
const button = (label: string, message: Message, h: H, variant = "secondary", disabled = false) => Button.view({ onClick: message, isDisabled: disabled, toView: attributes => h.button([...attributes.button, h.Class(`button ${variant}`)], [label]) }, h);
const submit = (label: string, busy: boolean, h: H) => Button.view({ type: "submit", isDisabled: busy, toView: attributes => h.button([...attributes.button, h.Class("button primary")], [busy ? "Working…" : label]) }, h);
const input = (label: string, id: string, value: string, change: (value: string) => Message, h: H, type = "text") => Input.view({ id, value, type, onInput: change, toView: attributes => h.div([h.Class("field")], [h.label([...attributes.label], [label]), h.input([...attributes.input, h.Class("input")])]) }, h);
const textarea = (label: string, id: string, value: string, change: (value: string) => Message, h: H) => h.div([h.Class("field")], [h.label([h.For(id)], [label]), h.textarea([h.Id(id), h.Value(value), h.OnInput(change), h.Class("input textarea")])]);
const select = (label: string, id: string, value: string, choices: [string, string][], change: (value: string) => Message, h: H) => h.div([h.Class("field")], [h.label([h.For(id)], [label]), h.select([h.Id(id), h.Value(value), h.OnInput(change), h.Class("input")], choices.map(([value, label]) => h.option([h.Value(value)], [label])))]);

function applicationForm(model: Model, h: H): Html {
  const field = (key: Exclude<keyof Draft, "status">, label: string, type = "text") => input(label, `application-${key}`, model.draft[key], value => Message.ChangedDraft({ field: key, value }), h, type);
  return h.aside([h.Class("editor panel")], [
    h.div([h.Class("section-heading")], [h.h2([], [model.draft.id ? "Edit application" : "New application"]), button("Close", Message.CancelEdit(), h, "ghost", model.busy)]),
    h.form([h.OnSubmit(Message.SubmitApplication()), h.Class("form")], [
      field("company", "Company"), field("role", "Role"),
      select("Status", "application-status", model.draft.status, statuses.map(s => [s, labels[s]]), value => Message.SelectedStatus({ status: statuses.find(status => status === value) ?? "saved" }), h),
      h.p([h.Class("hint")], ["Choose Applied only after you submit the application."]),
      h.div([h.Class("two-fields")], [field("date", "Date", "date"), field("deadline", "Deadline", "date")]),
      field("source", "Posting URL", "url"), field("location", "Location"),
      textarea("Job description", "application-posting", model.draft.posting, value => Message.ChangedDraft({ field: "posting", value }), h),
      textarea("Notes", "application-notes", model.draft.notes, value => Message.ChangedDraft({ field: "notes", value }), h),
      submit("Save application", model.busy, h),
    ]),
  ]);
}

function applications(model: Model, h: H): Html {
  const rows = model.snapshot.applications[model.person];
  const filtered = rows.filter(row => (!model.filter || row.status === model.filter) && `${row.company} ${row.role}`.toLowerCase().includes(model.search.toLowerCase())).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const groups = [["Saved / drafts", "saved", "drafted"], ["Applied", "applied"], ["Interviews", "interview"], ["Offers", "offer"], ["Hired", "hired"]];
  return h.div([h.Class("applications-layout")], [h.section([h.Class("application-main")], [
    h.div([h.Class("pipeline")], groups.map(([label, ...states]) => h.div([h.Class("stage")], [h.strong([], [String(rows.filter(row => states.includes(row.status)).length)]), h.span([], [label])]))),
    h.div([h.Class("toolbar")], [input("Search applications", "search", model.search, value => Message.ChangedSearch({ field: "search", value }), h, "search"), select("Status", "filter", model.filter, [["", "All statuses"], ...statuses.map((s): [string, string] => [s, labels[s]])], value => Message.ChangedSearch({ field: "filter", value }), h), button("Refresh", Message.Refreshed(), h, "secondary", model.loading)]),
    h.div([h.Class("table-panel panel")], filtered.length ? [h.table([], [
      h.thead([], [h.tr([], ["Company & role", "Status", "Deadline", "Actions"].map(label => h.th([], [label])))]),
      h.tbody([], filtered.map(row => h.keyed("tr")(row.id, [], [
        h.td([], [h.strong([], [row.company]), h.p([h.Class("muted")], [row.role]), ...(row.location ? [h.small([h.Class("muted")], [row.location])] : [])]),
        h.td([], [h.span([h.Class(`badge ${row.status}`)], [labels[row.status]]), ...(row.history.length > 1 ? [h.details([h.Class("history")], [h.summary([], ["History"]), ...row.history.map(event => h.p([], [`${event.date.slice(0, 10)} · ${labels[event.status]}${event.notes ? `: ${event.notes}` : ""}`]))])] : [])]),
        h.td([], [row.deadline || "—"]),
        h.td([], [h.div([h.Class("row-actions")], [button("Edit", Message.EditApplication({ id: row.id }), h, "ghost", model.busy), button("Prepare drafts", Message.Prepare({ id: row.id }), h, "ghost", model.busy), ...(row.source ? [h.a([h.Href(row.source), h.Target("_blank"), h.Rel("noopener noreferrer"), h.Class("text-link")], ["Posting ↗"])] : [])]), ...(row.notes ? [h.p([h.Class("row-notes")], [row.notes])] : [])]),
      ]))),
    ])] : [h.div([h.Class("empty")], [h.h2([], [rows.length ? "No matching applications" : "Your next role starts here."]), h.p([], [rows.length ? "Try another search or status." : "Save a job from discovery or add a posting to start your application workspace."]), button("Add application", Message.NewApplication(), h, "primary")])]),
    h.div([h.Class("agent-note")], [h.h3([], ["Work with your agent"]), h.code([], [`bun run job-search launch ${model.person} --agent opencode`]), h.p([], ["Prepare an application’s draft folder, then ask your agent to evaluate the role, tailor your CV or prepare for an interview."])]),
  ]), ...(model.editing ? [applicationForm(model, h)] : [])]);
}

function preferences(model: Model, h: H): Html {
  const change = (field: keyof Model["preferences"]) => (value: string) => Message.ChangedPreference({ field, value });
  return h.section([h.Class("preferences panel")], [
    h.h2([], ["Define what you’re looking for."]), h.p([h.Class("muted")], ["Only confirmed preferences guide your search. Leave anything unknown blank."]),
    h.form([h.OnSubmit(Message.SubmitPreferences()), h.Class("form")], [
      textarea("Target roles · one per line", "roles", model.preferences.roles, change("roles"), h),
      input("Preferred location", "location", model.preferences.location, change("location"), h),
      input("Languages and proficiency", "languages", model.preferences.languages, change("languages"), h),
      input("Salary expectations", "salary", model.preferences.salary, change("salary"), h),
      textarea("Constraints and deal-breakers", "constraints", model.preferences.constraints, change("constraints"), h),
      submit("Save preferences", model.busy, h),
    ]),
    h.div([h.Class("storage-note")], [h.strong([], ["Stored on your machine"]), h.code([], [`job-search/workspaces/${model.person}/state.json`]), h.p([], ["Preferences are saved under the preferences field. This workspace is Git-ignored."])]),
  ]);
}

function discovery(model: Model, h: H): Html {
  return h.section([], [h.div([h.Class("discovery panel")], [
    h.h2([], ["Find a role worth pursuing."]), h.p([h.Class("muted")], ["Search public tech listings from freehire.me, then save promising roles to your workspace."]),
    h.form([h.OnSubmit(Message.SearchJobs()), h.Class("form")], [input("Job title or skill", "query", model.query, value => Message.ChangedSearch({ field: "query", value }), h),
      h.div([h.Class("two-fields")], [input("Country code · e.g. IN", "country", model.country, value => Message.ChangedSearch({ field: "country", value }), h), select("Work mode", "remote", model.remote, [["", "Any"], ["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"]], value => Message.ChangedSearch({ field: "remote", value }), h)]), submit("Search jobs", model.busy, h)]),
  ]), h.div([h.Class("job-results")], model.jobs.map((job, index) => h.article([h.Class("job panel")], [h.div([], [h.h3([], [job.role]), h.p([h.Class("muted")], [`${job.company}${job.location ? ` · ${job.location}` : ""}`])]), h.div([h.Class("row-actions")], [h.a([h.Href(job.source), h.Target("_blank"), h.Rel("noopener noreferrer"), h.Class("text-link")], ["View posting ↗"]), button(model.snapshot.applications[model.person].some(row => row.source === job.source) ? "Saved" : "Save job", Message.SaveJob({ index }), h, "secondary", model.busy || model.snapshot.applications[model.person].some(row => row.source === job.source))])])))]);
}

export function view(model: Model, h: H): Document {
  const name = model.person === "laxman" ? "Laxman K R" : "Sraya Rajan";
  const title = { applications: "Applications", discover: "Discover jobs", preferences: "Preferences" }[model.section];
  return { title: `${title} · ${name}`, body: h.div([h.Class("app-shell")], [
    h.aside([h.Class("sidebar")], [h.a([h.Href("/"), h.Class("brand")], ["Job search", h.span([], ["Laxman & Sraya"])]),
      h.div([h.Class("candidate-picker"), h.Role("group"), h.AriaLabel("Candidate")], candidates.map(candidate => button(candidate === "laxman" ? "Laxman" : "Sraya", Message.SelectedPerson({ person: candidate }), h, model.person === candidate ? "primary" : "ghost", model.busy))),
      h.nav([h.AriaLabel("Workspace")], sections.map(section => button({ applications: "Applications", discover: "Discover jobs", preferences: "Preferences" }[section], Message.SelectedSection({ section }), h, model.section === section ? "nav-item selected" : "nav-item"))),
      h.div([h.Class("sidebar-bottom")], [h.p([], ["Your search. Your evidence."]), h.small([], ["Personal workspaces stay local."]), button(model.dark ? "Light theme" : "Dark theme", Message.ToggleTheme(), h, "secondary")]),
    ]),
    h.main([h.Class("main-content")], [h.header([h.Class("page-header")], [h.div([], [h.p([h.Class("muted")], [name]), h.h1([], [title])]), button("Add application", Message.NewApplication(), h, "primary", model.busy)]),
      ...(model.error ? [h.div([h.Class("notice error"), h.Role("alert")], [model.error])] : []),
      ...(model.notice ? [h.div([h.Class("notice"), h.Role("status")], [model.notice])] : []),
      model.loading ? h.p([h.Role("status"), h.Class("muted")], ["Loading workspace…"]) : model.section === "applications" ? applications(model, h) : model.section === "preferences" ? preferences(model, h) : discovery(model, h),
    ]),
  ]) };
}
