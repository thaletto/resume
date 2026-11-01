import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import {
  DiscoverQuery,
  Job,
  Person,
  WorkModeFilter,
  decodeInput,
} from '../../domain/index.ts'
import {
  failureMessage,
  makeClient,
  provideServer,
  saveApplication,
} from '../rpc.ts'
import { Message } from './message.ts'

// COMMAND

const decodeDiscoverQuery = decodeInput(DiscoverQuery)

export const SearchJobs = Command.define('SearchJobs', {
  args: {
    person: Person,
    query: Schema.String,
    country: Schema.String,
    workMode: WorkModeFilter,
  },
  messages: [Message.SucceededSearchJobs, Message.FailedSearchJobs],
  execute: ({ person, query, country, workMode }) =>
    provideServer(
      Effect.gen(function* () {
        const discoverQuery = yield* decodeDiscoverQuery({
          query,
          country,
          workMode,
        })
        const client = yield* makeClient
        return yield* client.DiscoverJobs({ query: discoverQuery })
      }),
    ).pipe(
      Effect.map(jobs => Message.SucceededSearchJobs({ person, jobs })),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedSearchJobs({ person, message: failureMessage(error) }),
        ),
      ),
    ),
})

export const SaveJob = Command.define('SaveJob', {
  args: { person: Person, job: Job },
  messages: [Message.SucceededSaveJob, Message.FailedSaveJob],
  execute: ({ person, job }) =>
    saveApplication(person, {
      company: job.company,
      role: job.role,
      status: 'saved',
      source: job.source,
      location: job.location,
      posting: job.posting,
    }).pipe(
      Effect.map(saved =>
        Message.SucceededSaveJob({ person, workspace: saved.workspace }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedSaveJob({ person, message: failureMessage(error) }),
        ),
      ),
    ),
})
