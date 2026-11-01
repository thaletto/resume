import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import type { Person, Workspace } from '../../domain/index.ts'
import { Submission } from '../submission.ts'
import { SavePreferences } from './commands.ts'
import { Message, OutMessage } from './message.ts'
import { Model, rolesText } from './model.ts'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

// INIT

export const init = (person: Person): Model => ({
  person,
  roles: '',
  location: '',
  constraints: '',
  languages: '',
  salary: '',
  submission: Submission.Idle(),
})

// UPDATE

const loadWorkspace = (model: Model, workspace: Workspace): Model =>
  modifyFields(model, {
    roles: () => rolesText(workspace.preferences),
    location: () => workspace.preferences.location,
    constraints: () => workspace.preferences.constraints,
    languages: () => workspace.preferences.languages,
    salary: () => workspace.preferences.salary,
  })

const startSubmission = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { submission: () => Submission.Submitting() }),
  commands: [
    SavePreferences({
      person: model.person,
      roles: model.roles,
      location: model.location,
      constraints: model.constraints,
      languages: model.languages,
      salary: model.salary,
    }),
  ],
  outMessage: OutMessage.StartedRequest(),
})

const submitPreferences = (model: Model): UpdateReturn =>
  Submission.match<UpdateReturn>(model.submission, {
    Submitting: () => ({ model }),
    Idle: () => startSubmission(model),
    SubmitFailed: () => startSubmission(model),
  })

const ignoreOtherPerson = (
  model: Model,
  person: Person,
  respond: () => UpdateReturn,
): UpdateReturn => {
  if (person !== model.person) {
    return { model }
  }
  return respond()
}

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    UpdatedWorkspace: ({ workspace }) =>
      ignoreOtherPerson(model, workspace.person, () => ({
        model: loadWorkspace(model, workspace),
      })),
    UpdatedRoles: ({ value }) => ({
      model: modifyFields(model, { roles: () => value }),
    }),
    UpdatedLocation: ({ value }) => ({
      model: modifyFields(model, { location: () => value }),
    }),
    UpdatedLanguages: ({ value }) => ({
      model: modifyFields(model, { languages: () => value }),
    }),
    UpdatedSalary: ({ value }) => ({
      model: modifyFields(model, { salary: () => value }),
    }),
    UpdatedConstraints: ({ value }) => ({
      model: modifyFields(model, { constraints: () => value }),
    }),
    SubmittedPreferences: () => submitPreferences(model),
    SucceededSavePreferences: ({ person, workspace }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(loadWorkspace(model, workspace), {
          submission: () => Submission.Idle(),
        }),
        outMessage: OutMessage.SavedPreferences({ workspace }),
      })),
    FailedSavePreferences: ({ person, message: failure }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, {
          submission: () =>
            Submission.SubmitFailed({ message: failure, fieldErrors: [] }),
        }),
        outMessage: OutMessage.FailedRequest({ message: failure }),
      })),
  })

export const updateWorkspace = (
  model: Model,
  workspace: Workspace,
): UpdateReturn => update(model, Message.UpdatedWorkspace({ workspace }))
