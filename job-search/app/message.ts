import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Person, Workspace } from '../domain/index.ts'
import * as Applications from './applications/index.ts'
import * as Discover from './discover/index.ts'
import { Section } from './model.ts'
import * as Preferences from './preferences/index.ts'

// MESSAGE

export const Message = defineMessageUnion({
  SelectedCandidate: { person: Person },
  SelectedSection: { section: Section },
  ClickedAddApplication: {},
  ClickedRetryLoadWorkspace: {},
  ClickedToggleTheme: {},
  CompletedApplyTheme: {},
  SucceededLoadWorkspace: { workspace: Workspace },
  FailedLoadWorkspace: { person: Person, message: Schema.String },
  GotApplicationsMessage: { message: Applications.Message },
  GotDiscoverMessage: { message: Discover.Message },
  GotPreferencesMessage: { message: Preferences.Message },
})
export type Message = typeof Message.Type
