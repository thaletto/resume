import { Effect } from 'effect'
import { Command } from 'foldkit'

import { Person } from '../domain/index.ts'
import { Message } from './message.ts'
import { Theme } from './model.ts'
import { failureMessage, makeClient, provideServer } from './rpc.ts'

// COMMAND

const THEME_STORAGE_KEY = 'job-search-theme'

export const LoadWorkspace = Command.define('LoadWorkspace', {
  args: { person: Person },
  messages: [Message.SucceededLoadWorkspace, Message.FailedLoadWorkspace],
  execute: ({ person }) =>
    provideServer(
      Effect.gen(function* () {
        const client = yield* makeClient
        return yield* client.GetWorkspace({ person })
      }),
    ).pipe(
      Effect.map(workspace => Message.SucceededLoadWorkspace({ workspace })),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedLoadWorkspace({
            person,
            message: failureMessage(error),
          }),
        ),
      ),
    ),
})

export const ApplyTheme = Command.define('ApplyTheme', {
  args: { theme: Theme },
  messages: [Message.CompletedApplyTheme],
  execute: ({ theme }) =>
    Effect.gen(function* () {
      const isDark = Theme.match(theme, {
        Light: () => false,
        Dark: () => true,
      })
      yield* Effect.sync(() =>
        document.documentElement.classList.toggle('dark', isDark),
      )
      yield* Effect.try(() =>
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light'),
      ).pipe(Effect.ignore)
      return Message.CompletedApplyTheme()
    }),
})
