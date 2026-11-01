import { Schema } from 'effect'

import { Person } from './person.ts'
import { Status } from './status.ts'
import {
  OptionalDate,
  OptionalHttpUrl,
  RequiredText,
  TrimmedText,
} from './text.ts'

export const StatusEvent = Schema.Struct({
  status: Status,
  date: Schema.String,
  notes: Schema.String,
})
export type StatusEvent = typeof StatusEvent.Type

export const Application = Schema.Struct({
  id: Schema.String,
  company: Schema.String,
  role: Schema.String,
  status: Status,
  date: Schema.String,
  deadline: Schema.String,
  source: Schema.String,
  notes: Schema.String,
  posting: Schema.String,
  location: Schema.String,
  history: Schema.Array(StatusEvent),
  createdAt: Schema.String,
  updatedAt: Schema.String,
})
export type Application = typeof Application.Type

export const ApplicationId = RequiredText('Application ID', 64)

export const ApplicationInput = Schema.Struct({
  id: Schema.optionalKey(ApplicationId),
  company: RequiredText('Company', 250),
  role: RequiredText('Role', 250),
  status: Status,
  date: Schema.optionalKey(OptionalDate('Date')),
  deadline: Schema.optionalKey(OptionalDate('Deadline')),
  source: Schema.optionalKey(OptionalHttpUrl('Posting URL', 2000)),
  notes: Schema.optionalKey(TrimmedText('Notes')),
  posting: Schema.optionalKey(TrimmedText('Posting', 100000)),
  location: Schema.optionalKey(TrimmedText('Location', 250)),
})
export type ApplicationInput = typeof ApplicationInput.Type

export const StatusUpdate = Schema.Struct({
  person: Person,
  id: ApplicationId,
  status: Status,
  notes: Schema.optionalKey(TrimmedText('Notes')),
})
export type StatusUpdate = typeof StatusUpdate.Type
