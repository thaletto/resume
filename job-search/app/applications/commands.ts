import { Effect } from 'effect'
import { Command } from 'foldkit'

import { Person } from '../../domain/index.ts'
import {
  failureMessage,
  makeClient,
  provideServer,
  saveApplication,
} from '../rpc.ts'
import { Message } from './message.ts'
import { Draft } from './model.ts'

// COMMAND

const draftFields = (draft: Draft) => ({
  company: draft.company,
  role: draft.role,
  status: draft.status,
  date: draft.date,
  deadline: draft.deadline,
  source: draft.source,
  notes: draft.notes,
  posting: draft.posting,
  location: draft.location,
})

const draftInput = (draft: Draft) => {
  if (draft.id === '') {
    return draftFields(draft)
  }
  return { id: draft.id, ...draftFields(draft) }
}

export const SaveApplication = Command.define('SaveApplication', {
  args: { person: Person, draft: Draft },
  messages: [Message.SucceededSaveApplication, Message.FailedSaveApplication],
  execute: ({ person, draft }) =>
    saveApplication(person, draftInput(draft)).pipe(
      Effect.map(saved =>
        Message.SucceededSaveApplication({
          person,
          workspace: saved.workspace,
        }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedSaveApplication({
            person,
            message: failureMessage(error),
          }),
        ),
      ),
    ),
})

export const PrepareApplication = Command.define('PrepareApplication', {
  args: { person: Person, id: Draft.fields.id },
  messages: [
    Message.SucceededPrepareApplication,
    Message.FailedPrepareApplication,
  ],
  execute: ({ person, id }) =>
    provideServer(
      Effect.gen(function* () {
        const client = yield* makeClient
        return yield* client.PrepareApplication({ person, id })
      }),
    ).pipe(
      Effect.map(prepared =>
        Message.SucceededPrepareApplication({
          person,
          path: prepared.path,
          workspace: prepared.workspace,
        }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedPrepareApplication({
            person,
            message: failureMessage(error),
          }),
        ),
      ),
    ),
})
