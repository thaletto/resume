import { Option } from 'effect'
import { Update } from 'foldkit'
import type { Runtime } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import type { Person, Workspace } from '../domain/index.ts'
import * as Applications from './applications/index.ts'
import { ApplyTheme, LoadWorkspace } from './commands.ts'
import * as Discover from './discover/index.ts'
import { Message } from './message.ts'
import { Model, Notice, Section, Theme, WorkspaceState } from './model.ts'
import * as Preferences from './preferences/index.ts'

export { Message } from './message.ts'
export { Model } from './model.ts'
export { view } from './view.ts'

type UpdateReturn = Update.Return<Model, Message>
type UpdateStep = Update.Step<Model, Message>

const INITIAL_CANDIDATE: Person = 'laxman'

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    candidate: INITIAL_CANDIDATE,
    section: Section.Applications(),
    theme: Theme.Light(),
    maybeNotice: Option.none(),
    workspace: WorkspaceState.Loading(),
    applications: Applications.init(INITIAL_CANDIDATE),
    discover: Discover.init(INITIAL_CANDIDATE),
    preferences: Preferences.init(INITIAL_CANDIDATE),
  },
  commands: [LoadWorkspace({ person: INITIAL_CANDIDATE })],
})

// UPDATE

const showNotice =
  (notice: Notice): UpdateStep =>
  model => ({
    model: modifyFields(model, { maybeNotice: () => Option.some(notice) }),
  })

const clearNotice: UpdateStep = model => ({
  model: modifyFields(model, { maybeNotice: () => Option.none() }),
})

const acceptWorkspace =
  (workspace: Workspace, notice: Notice): UpdateStep =>
  model => {
    if (workspace.person !== model.candidate) {
      return { model }
    }
    return {
      model: modifyFields(model, {
        workspace: () => WorkspaceState.Ready({ workspace }),
        maybeNotice: () => Option.some(notice),
      }),
    }
  }

const startLoadingWorkspace = (model: Model): UpdateReturn => ({
  model: modifyFields(model, {
    workspace: () => WorkspaceState.Loading(),
    maybeNotice: () => Option.none(),
  }),
  commands: [LoadWorkspace({ person: model.candidate })],
})

const foldApplicationsOutMessage = Applications.OutMessage.match<UpdateStep>({
  StartedRequest: () => clearNotice,
  RequestedRefresh: () => startLoadingWorkspace,
  SavedApplication: ({ workspace }) =>
    acceptWorkspace(workspace, Notice.Info({ message: 'Application saved.' })),
  PreparedApplication: ({ path, workspace }) =>
    acceptWorkspace(
      workspace,
      Notice.Info({ message: `Draft folder ready: ${path}` }),
    ),
  FailedRequest: ({ message }) => showNotice(Notice.Error({ message })),
})

const readApplications = (model: Model) => Option.some(model.applications)

const writeApplications = (
  model: Model,
  nextApplications: Applications.Model,
) => modifyFields(model, { applications: () => nextApplications })

const toApplicationsMessage = (message: Applications.Message) =>
  Message.GotApplicationsMessage({ message })

const foldApplications = Update.foldChild({
  update: Applications.update,
  read: readApplications,
  write: writeApplications,
  toParentMessage: toApplicationsMessage,
  foldOutMessage: foldApplicationsOutMessage,
})

const foldAddApplication = Update.foldChildStep({
  update: Applications.addApplication,
  read: readApplications,
  write: writeApplications,
  toParentMessage: toApplicationsMessage,
  foldOutMessage: foldApplicationsOutMessage,
})

const foldDiscoverOutMessage = Discover.OutMessage.match<UpdateStep>({
  StartedRequest: () => clearNotice,
  FoundJobs: ({ count }) => {
    if (count === 0) {
      return showNotice(
        Notice.Info({ message: 'No results. Try a broader search.' }),
      )
    }
    return showNotice(Notice.Info({ message: `${count} jobs found.` }))
  },
  SavedJob: ({ workspace }) =>
    acceptWorkspace(workspace, Notice.Info({ message: 'Application saved.' })),
  FailedRequest: ({ message }) => showNotice(Notice.Error({ message })),
})

const foldDiscover = Update.foldChild({
  update: Discover.update,
  read: (model: Model) => Option.some(model.discover),
  write: (model: Model, nextDiscover: Discover.Model) =>
    modifyFields(model, { discover: () => nextDiscover }),
  toParentMessage: (message: Discover.Message) =>
    Message.GotDiscoverMessage({ message }),
  foldOutMessage: foldDiscoverOutMessage,
})

const foldPreferencesOutMessage = Preferences.OutMessage.match<UpdateStep>({
  StartedRequest: () => clearNotice,
  SavedPreferences: ({ workspace }) =>
    acceptWorkspace(
      workspace,
      Notice.Info({ message: 'Preferences saved to your local workspace.' }),
    ),
  FailedRequest: ({ message }) => showNotice(Notice.Error({ message })),
})

const readPreferences = (model: Model) => Option.some(model.preferences)

const writePreferences = (model: Model, nextPreferences: Preferences.Model) =>
  modifyFields(model, { preferences: () => nextPreferences })

const toPreferencesMessage = (message: Preferences.Message) =>
  Message.GotPreferencesMessage({ message })

const foldPreferences = Update.foldChild({
  update: Preferences.update,
  read: readPreferences,
  write: writePreferences,
  toParentMessage: toPreferencesMessage,
  foldOutMessage: foldPreferencesOutMessage,
})

const foldWorkspaceIntoPreferences = Update.foldChild({
  update: Preferences.updateWorkspace,
  read: readPreferences,
  write: writePreferences,
  toParentMessage: toPreferencesMessage,
  foldOutMessage: foldPreferencesOutMessage,
})

const selectCandidate = (model: Model, candidate: Person): UpdateReturn => {
  if (candidate === model.candidate) {
    return { model }
  }
  return {
    model: modifyFields(model, {
      candidate: () => candidate,
      maybeNotice: () => Option.none(),
      workspace: () => WorkspaceState.Loading(),
      applications: () => Applications.init(candidate),
      discover: () => Discover.init(candidate),
      preferences: () => Preferences.init(candidate),
    }),
    commands: [LoadWorkspace({ person: candidate })],
  }
}

const selectSection = (model: Model, section: Section): UpdateReturn => ({
  model: modifyFields(model, {
    section: () => section,
    maybeNotice: () => Option.none(),
  }),
})

const addApplication = (model: Model): UpdateReturn =>
  Update.combine(model, [
    stepModel => ({
      model: modifyFields(stepModel, {
        section: () => Section.Applications(),
        maybeNotice: () => Option.none(),
      }),
    }),
    foldAddApplication,
  ])

const toggleTheme = (model: Model): UpdateReturn => {
  const nextTheme = Theme.match(model.theme, {
    Light: () => Theme.Dark(),
    Dark: () => Theme.Light(),
  })
  return {
    model: modifyFields(model, { theme: () => nextTheme }),
    commands: [ApplyTheme({ theme: nextTheme })],
  }
}

const loadedWorkspace = (model: Model, workspace: Workspace): UpdateReturn => {
  if (workspace.person !== model.candidate) {
    return { model }
  }
  return Update.combine(model, [
    stepModel => ({
      model: modifyFields(stepModel, {
        workspace: () => WorkspaceState.Ready({ workspace }),
      }),
    }),
    foldWorkspaceIntoPreferences(workspace),
  ])
}

const failedLoadingWorkspace = (
  model: Model,
  person: Person,
  message: string,
): UpdateReturn => {
  if (person !== model.candidate) {
    return { model }
  }
  return {
    model: modifyFields(model, {
      workspace: () => WorkspaceState.LoadFailed({ message }),
    }),
  }
}

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    SelectedCandidate: ({ person }) => selectCandidate(model, person),
    SelectedSection: ({ section }) => selectSection(model, section),
    ClickedAddApplication: () => addApplication(model),
    ClickedRetryLoadWorkspace: () => startLoadingWorkspace(model),
    ClickedToggleTheme: () => toggleTheme(model),
    CompletedApplyTheme: () => ({ model }),
    SucceededLoadWorkspace: ({ workspace }) =>
      loadedWorkspace(model, workspace),
    FailedLoadWorkspace: ({ person, message: failure }) =>
      failedLoadingWorkspace(model, person, failure),
    GotApplicationsMessage: ({ message: applicationsMessage }) =>
      foldApplications(model, applicationsMessage),
    GotDiscoverMessage: ({ message: discoverMessage }) =>
      foldDiscover(model, discoverMessage),
    GotPreferencesMessage: ({ message: preferencesMessage }) =>
      foldPreferences(model, preferencesMessage),
  })
