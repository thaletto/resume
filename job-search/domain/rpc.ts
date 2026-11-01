import { Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/rpc'

import { ApplicationId, ApplicationInput, StatusUpdate } from './application.ts'
import {
  DuplicatePostingError,
  JobSourceError,
  NotFoundError,
  StorageError,
  ValidationError,
} from './errors.ts'
import { DiscoverQuery, Job } from './job.ts'
import { Person } from './person.ts'
import { PreferencesInput } from './preferences.ts'
import { PreparedApplication, SavedApplication, Workspace } from './state.ts'

export const GetWorkspace = Rpc.make('GetWorkspace', {
  payload: { person: Person },
  success: Workspace,
  error: StorageError,
})

export const SaveApplication = Rpc.make('SaveApplication', {
  payload: { person: Person, application: ApplicationInput },
  success: SavedApplication,
  error: Schema.Union([
    ValidationError,
    NotFoundError,
    DuplicatePostingError,
    StorageError,
  ]),
})

export const UpdateApplicationStatus = Rpc.make('UpdateApplicationStatus', {
  payload: StatusUpdate,
  success: SavedApplication,
  error: Schema.Union([ValidationError, NotFoundError, StorageError]),
})

export const SavePreferences = Rpc.make('SavePreferences', {
  payload: { person: Person, preferences: PreferencesInput },
  success: Workspace,
  error: Schema.Union([ValidationError, StorageError]),
})

export const PrepareApplication = Rpc.make('PrepareApplication', {
  payload: { person: Person, id: ApplicationId },
  success: PreparedApplication,
  error: Schema.Union([NotFoundError, StorageError]),
})

export const DiscoverJobs = Rpc.make('DiscoverJobs', {
  payload: { query: DiscoverQuery },
  success: Schema.Array(Job),
  error: Schema.Union([ValidationError, JobSourceError]),
})

export const JobSearchRpcs = RpcGroup.make(
  GetWorkspace,
  SaveApplication,
  UpdateApplicationStatus,
  SavePreferences,
  PrepareApplication,
  DiscoverJobs,
)
