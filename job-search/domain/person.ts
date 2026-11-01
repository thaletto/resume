import { Schema } from 'effect'

export const PEOPLE = ['laxman', 'sraya'] as const

export const Person = Schema.Literals(PEOPLE).annotate({
  message: 'Choose Laxman or Sraya',
})
export type Person = typeof Person.Type

export const Agent = Schema.Literals(['opencode', 'claude', 'codex'])
export type Agent = typeof Agent.Type

export const Profile = Schema.Struct({
  name: Schema.String,
  resume: Schema.String,
})
export type Profile = typeof Profile.Type

export const Profiles = Schema.Struct({
  laxman: Profile,
  sraya: Profile,
})
export type Profiles = typeof Profiles.Type
