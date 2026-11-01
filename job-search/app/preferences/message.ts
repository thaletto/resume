import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Person, Workspace } from '../../domain/index.ts'

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedWorkspace: { workspace: Workspace },
  UpdatedRoles: { value: Schema.String },
  UpdatedLocation: { value: Schema.String },
  UpdatedLanguages: { value: Schema.String },
  UpdatedSalary: { value: Schema.String },
  UpdatedConstraints: { value: Schema.String },
  SubmittedPreferences: {},
  SucceededSavePreferences: { person: Person, workspace: Workspace },
  FailedSavePreferences: { person: Person, message: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  StartedRequest: {},
  SavedPreferences: { workspace: Workspace },
  FailedRequest: { message: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
