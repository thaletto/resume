import { Array, Schema } from 'effect'

import { Person, type Preferences } from '../../domain/index.ts'
import { Submission } from '../submission.ts'

// MODEL

export const Model = Schema.Struct({
  person: Person,
  roles: Schema.String,
  location: Schema.String,
  constraints: Schema.String,
  languages: Schema.String,
  salary: Schema.String,
  submission: Submission,
})
export type Model = typeof Model.Type

export const rolesText = (preferences: Preferences): string =>
  Array.join(preferences.roles, '\n')
