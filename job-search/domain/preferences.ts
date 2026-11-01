import { Schema, SchemaTransformation } from 'effect'

import { TrimmedText } from './text.ts'

export const MAX_TARGET_ROLES = 20

export const Preferences = Schema.Struct({
  roles: Schema.Array(Schema.String),
  location: Schema.String,
  constraints: Schema.String,
  languages: Schema.String,
  salary: Schema.String,
})
export type Preferences = typeof Preferences.Type

export const EMPTY_PREFERENCES: Preferences = {
  roles: [],
  location: '',
  constraints: '',
  languages: '',
  salary: '',
}

export const PreferencesInput = Schema.Struct({
  roles: Schema.Array(TrimmedText('Target role', 250))
    .check(
      Schema.isMaxLength(MAX_TARGET_ROLES, {
        message: `Provide up to ${MAX_TARGET_ROLES} target roles`,
      }),
    )
    .pipe(
      Schema.decodeTo(
        Schema.Array(Schema.String),
        SchemaTransformation.transform({
          decode: (roles: ReadonlyArray<string>): ReadonlyArray<string> =>
            roles.filter(role => role !== ''),
          encode: (roles: ReadonlyArray<string>) => roles,
        }),
      ),
    ),
  location: TrimmedText('Location', 250),
  constraints: TrimmedText('Constraints'),
  languages: TrimmedText('Languages', 2000),
  salary: TrimmedText('Salary', 1000),
})
export type PreferencesInput = typeof PreferencesInput.Type
