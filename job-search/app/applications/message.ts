import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import {
  Application,
  FieldIssue,
  Person,
  Workspace,
} from '../../domain/index.ts'

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedSearch: { value: Schema.String },
  SelectedStatusFilter: { value: Schema.String },
  ClickedRefresh: {},
  ClickedAddApplication: {},
  ClickedEditApplication: { application: Application },
  ClickedCloseEditor: {},
  UpdatedCompany: { value: Schema.String },
  UpdatedRole: { value: Schema.String },
  SelectedStatus: { value: Schema.String },
  UpdatedDate: { value: Schema.String },
  UpdatedDeadline: { value: Schema.String },
  UpdatedSource: { value: Schema.String },
  UpdatedLocation: { value: Schema.String },
  UpdatedPosting: { value: Schema.String },
  UpdatedNotes: { value: Schema.String },
  SubmittedApplication: {},
  SucceededSaveApplication: { person: Person, workspace: Workspace },
  FailedSaveApplication: {
    person: Person,
    message: Schema.String,
    fieldErrors: Schema.Array(FieldIssue),
  },
  CompletedFocusEditorField: {},
  ClickedPrepareApplication: { id: Schema.String },
  SucceededPrepareApplication: {
    person: Person,
    path: Schema.String,
    workspace: Workspace,
  },
  FailedPrepareApplication: { person: Person, message: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  StartedRequest: {},
  RequestedRefresh: {},
  SavedApplication: { workspace: Workspace },
  PreparedApplication: { path: Schema.String, workspace: Workspace },
  FailedRequest: { message: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
