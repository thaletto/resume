import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Job, Person, WorkModeFilter } from '../../domain/index.ts'

// MODEL

export const Search = defineTaggedUnion({
  NotSearched: {},
  Searching: {},
  Found: { jobs: Schema.Array(Job) },
  SearchFailed: { message: Schema.String },
})
export type Search = typeof Search.Type

export const JobSave = defineTaggedUnion({
  Idle: {},
  Saving: { source: Schema.String },
  SaveFailed: { message: Schema.String },
})
export type JobSave = typeof JobSave.Type

export const Model = Schema.Struct({
  person: Person,
  query: Schema.String,
  country: Schema.String,
  workMode: WorkModeFilter,
  search: Search,
  jobSave: JobSave,
})
export type Model = typeof Model.Type
