import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { type Application, Person, Status } from '../../domain/index.ts'
import { Submission } from '../submission.ts'

// MODEL

export const Draft = Schema.Struct({
  id: Schema.String,
  company: Schema.String,
  role: Schema.String,
  status: Status,
  date: Schema.String,
  deadline: Schema.String,
  source: Schema.String,
  location: Schema.String,
  posting: Schema.String,
  notes: Schema.String,
})
export type Draft = typeof Draft.Type

export const Editor = defineTaggedUnion({
  Closed: {},
  Editing: { draft: Draft },
})
export type Editor = typeof Editor.Type

export const Preparation = defineTaggedUnion({
  Idle: {},
  Preparing: { id: Schema.String },
})
export type Preparation = typeof Preparation.Type

export const Model = Schema.Struct({
  person: Person,
  search: Schema.String,
  maybeStatusFilter: Schema.Option(Status),
  editor: Editor,
  submission: Submission,
  preparation: Preparation,
})
export type Model = typeof Model.Type

export const blankDraft = (): Draft => ({
  id: '',
  company: '',
  role: '',
  status: 'saved',
  date: '',
  deadline: '',
  source: '',
  location: '',
  posting: '',
  notes: '',
})

export const draftFromApplication = (application: Application): Draft => ({
  id: application.id,
  company: application.company,
  role: application.role,
  status: application.status,
  date: application.date,
  deadline: application.deadline,
  source: application.source,
  location: application.location,
  posting: application.posting,
  notes: application.notes,
})
