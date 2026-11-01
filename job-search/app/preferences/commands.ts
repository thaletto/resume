import { Array, Effect, Schema, String, pipe } from 'effect'
import { Command } from 'foldkit'

import { Person, PreferencesInput, decodeInput } from '../../domain/index.ts'
import { failureMessage, makeClient, provideServer } from '../rpc.ts'
import { Message } from './message.ts'

// COMMAND

const decodePreferencesInput = decodeInput(PreferencesInput)

const roleLines = (roles: string): ReadonlyArray<string> =>
  pipe(
    roles,
    String.split('\n'),
    Array.map(String.trim),
    Array.filter(String.isNonEmpty),
  )

export const SavePreferences = Command.define('SavePreferences', {
  args: {
    person: Person,
    roles: Schema.String,
    location: Schema.String,
    constraints: Schema.String,
    languages: Schema.String,
    salary: Schema.String,
  },
  messages: [Message.SucceededSavePreferences, Message.FailedSavePreferences],
  execute: ({ person, roles, location, constraints, languages, salary }) =>
    provideServer(
      Effect.gen(function* () {
        const preferences = yield* decodePreferencesInput({
          roles: roleLines(roles),
          location,
          constraints,
          languages,
          salary,
        })
        const client = yield* makeClient
        return yield* client.SavePreferences({ person, preferences })
      }),
    ).pipe(
      Effect.map(workspace =>
        Message.SucceededSavePreferences({ person, workspace }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedSavePreferences({
            person,
            message: failureMessage(error),
          }),
        ),
      ),
    ),
})
