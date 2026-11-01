import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Job, Person, Workspace } from '../../domain/index.ts'

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  UpdatedCountry: { value: Schema.String },
  SelectedWorkMode: { value: Schema.String },
  SubmittedSearch: {},
  SucceededSearchJobs: { person: Person, jobs: Schema.Array(Job) },
  FailedSearchJobs: { person: Person, message: Schema.String },
  ClickedSaveJob: { job: Job },
  SucceededSaveJob: { person: Person, workspace: Workspace },
  FailedSaveJob: { person: Person, message: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  StartedRequest: {},
  FoundJobs: { count: Schema.Number },
  SavedJob: { workspace: Workspace },
  FailedRequest: { message: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
