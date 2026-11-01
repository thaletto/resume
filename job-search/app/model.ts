import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Person, Workspace } from '../domain/index.ts'
import * as Applications from './applications/index.ts'
import * as Discover from './discover/index.ts'
import * as Preferences from './preferences/index.ts'

// MODEL

export const Section = defineTaggedUnion({
  Applications: {},
  Discover: {},
  Preferences: {},
})
export type Section = typeof Section.Type

export const Theme = defineTaggedUnion({
  Light: {},
  Dark: {},
})
export type Theme = typeof Theme.Type

export const Notice = defineTaggedUnion({
  Info: { message: Schema.String },
  Error: { message: Schema.String },
})
export type Notice = typeof Notice.Type

export const WorkspaceState = defineTaggedUnion({
  Loading: {},
  LoadFailed: { message: Schema.String },
  Ready: { workspace: Workspace },
})
export type WorkspaceState = typeof WorkspaceState.Type

export const Model = Schema.Struct({
  candidate: Person,
  section: Section,
  theme: Theme,
  maybeNotice: Schema.Option(Notice),
  workspace: WorkspaceState,
  applications: Applications.Model,
  discover: Discover.Model,
  preferences: Preferences.Model,
})
export type Model = typeof Model.Type

export const candidateLabel = (candidate: Person): string => {
  if (candidate === 'laxman') {
    return 'Laxman'
  }
  return 'Sraya'
}
