import { Option, Schema } from 'effect'
import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Status } from '../../domain/index.ts'
import type { Person } from '../../domain/index.ts'
import { Submission } from '../submission.ts'
import { PrepareApplication, SaveApplication } from './commands.ts'
import { Message, OutMessage } from './message.ts'
import {
  type Draft,
  Editor,
  Model,
  Preparation,
  blankDraft,
  draftFromApplication,
} from './model.ts'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

// INIT

export const init = (person: Person): Model => ({
  person,
  search: '',
  maybeStatusFilter: Option.none(),
  editor: Editor.Closed(),
  submission: Submission.Idle(),
  preparation: Preparation.Idle(),
})

// UPDATE

const decodeStatus = Schema.decodeUnknownOption(Status)

const openEditor = (model: Model, draft: Draft): UpdateReturn =>
  Submission.match<UpdateReturn>(model.submission, {
    Submitting: () => ({ model }),
    Idle: () => ({
      model: modifyFields(model, { editor: () => Editor.Editing({ draft }) }),
    }),
    SubmitFailed: () => ({
      model: modifyFields(model, {
        editor: () => Editor.Editing({ draft }),
        submission: () => Submission.Idle(),
      }),
    }),
  })

const editDraft = (
  model: Model,
  change: (draft: Draft) => Draft,
): UpdateReturn =>
  Editor.match<UpdateReturn>(model.editor, {
    Closed: () => ({ model }),
    Editing: ({ draft }) => ({
      model: modifyFields(model, {
        editor: () => Editor.Editing({ draft: change(draft) }),
      }),
    }),
  })

const submitDraft = (model: Model, draft: Draft): UpdateReturn => ({
  model: modifyFields(model, { submission: () => Submission.Submitting() }),
  commands: [SaveApplication({ person: model.person, draft })],
  outMessage: OutMessage.StartedRequest(),
})

const submitEditor = (model: Model): UpdateReturn =>
  Editor.match<UpdateReturn>(model.editor, {
    Closed: () => ({ model }),
    Editing: ({ draft }) =>
      Submission.match<UpdateReturn>(model.submission, {
        Submitting: () => ({ model }),
        Idle: () => submitDraft(model, draft),
        SubmitFailed: () => submitDraft(model, draft),
      }),
  })

const closeEditor = (model: Model): UpdateReturn =>
  Submission.match<UpdateReturn>(model.submission, {
    Submitting: () => ({ model }),
    Idle: () => ({
      model: modifyFields(model, { editor: () => Editor.Closed() }),
    }),
    SubmitFailed: () => ({
      model: modifyFields(model, {
        editor: () => Editor.Closed(),
        submission: () => Submission.Idle(),
      }),
    }),
  })

const startPreparation = (model: Model, id: string): UpdateReturn =>
  Preparation.match<UpdateReturn>(model.preparation, {
    Preparing: () => ({ model }),
    Idle: () => ({
      model: modifyFields(model, {
        preparation: () => Preparation.Preparing({ id }),
      }),
      commands: [PrepareApplication({ person: model.person, id })],
      outMessage: OutMessage.StartedRequest(),
    }),
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
    UpdatedSearch: ({ value }) => ({
      model: modifyFields(model, { search: () => value }),
    }),
    SelectedStatusFilter: ({ value }) => ({
      model: modifyFields(model, {
        maybeStatusFilter: () => decodeStatus(value),
      }),
    }),
    ClickedRefresh: () => ({
      model,
      outMessage: OutMessage.RequestedRefresh(),
    }),
    ClickedAddApplication: () => openEditor(model, blankDraft()),
    ClickedEditApplication: ({ application }) =>
      openEditor(model, draftFromApplication(application)),
    ClickedCloseEditor: () => closeEditor(model),
    UpdatedCompany: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { company: () => value })),
    UpdatedRole: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { role: () => value })),
    SelectedStatus: ({ value }) =>
      Option.match(decodeStatus(value), {
        onNone: () => ({ model }),
        onSome: status =>
          editDraft(model, draft =>
            modifyFields(draft, { status: () => status }),
          ),
      }),
    UpdatedDate: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { date: () => value })),
    UpdatedDeadline: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { deadline: () => value })),
    UpdatedSource: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { source: () => value })),
    UpdatedLocation: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { location: () => value })),
    UpdatedPosting: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { posting: () => value })),
    UpdatedNotes: ({ value }) =>
      editDraft(model, draft => modifyFields(draft, { notes: () => value })),
    SubmittedApplication: () => submitEditor(model),
    SucceededSaveApplication: ({ person, workspace }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, {
          editor: () => Editor.Closed(),
          submission: () => Submission.Idle(),
        }),
        outMessage: OutMessage.SavedApplication({ workspace }),
      })),
    FailedSaveApplication: ({ person, message: failure }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, {
          submission: () => Submission.SubmitFailed({ message: failure }),
        }),
        outMessage: OutMessage.FailedRequest({ message: failure }),
      })),
    ClickedPrepareApplication: ({ id }) => startPreparation(model, id),
    SucceededPrepareApplication: ({ person, path, workspace }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, { preparation: () => Preparation.Idle() }),
        outMessage: OutMessage.PreparedApplication({ path, workspace }),
      })),
    FailedPrepareApplication: ({ person, message: failure }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, { preparation: () => Preparation.Idle() }),
        outMessage: OutMessage.FailedRequest({ message: failure }),
      })),
  })

export const addApplication = (model: Model): UpdateReturn =>
  update(model, Message.ClickedAddApplication())
