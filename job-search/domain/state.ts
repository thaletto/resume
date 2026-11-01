import { Schema } from 'effect'

import { Application } from './application.ts'
import { Person, Profile } from './person.ts'
import { EMPTY_PREFERENCES, Preferences } from './preferences.ts'

export const State = Schema.Struct({
  version: Schema.Literal(1),
  preferences: Preferences,
  applications: Schema.Array(Application),
})
export type State = typeof State.Type

export const EMPTY_STATE: State = {
  version: 1,
  preferences: EMPTY_PREFERENCES,
  applications: [],
}

export const Workspace = Schema.Struct({
  person: Person,
  profile: Profile,
  preferences: Preferences,
  applications: Schema.Array(Application),
})
export type Workspace = typeof Workspace.Type

export const SavedApplication = Schema.Struct({
  application: Application,
  workspace: Workspace,
})
export type SavedApplication = typeof SavedApplication.Type

export const PreparedApplication = Schema.Struct({
  path: Schema.String,
  workspace: Workspace,
})
export type PreparedApplication = typeof PreparedApplication.Type
