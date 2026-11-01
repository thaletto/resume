import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import * as Applications from './applications/index.ts'
import { ApplyTheme, LoadWorkspace } from './commands.ts'
import { makeApplication, makeWorkspace } from './fixtures.ts'
import { init, update } from './main.ts'
import { Message } from './message.ts'
import { Notice, WorkspaceState } from './model.ts'

const laxman = makeWorkspace('laxman')
const sraya = makeWorkspace('sraya')

describe('shell story', () => {
  test('loads the initial candidate workspace on init', () => {
    const initial = init()
    expect(initial.commands?.map(command => command.name)).toStrictEqual([
      'LoadWorkspace',
    ])
    expect(initial.model.workspace._tag).toBe('Loading')
  })

  test('ignores workspace responses for a candidate that is no longer selected', () => {
    story(
      update,
      given(init().model),
      message(Message.SelectedCandidate({ person: 'sraya' })),
      Command.expectExact(LoadWorkspace),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: laxman }),
      ),
      model(current => {
        expect(current.candidate).toBe('sraya')
        expect(current.workspace._tag).toBe('Loading')
      }),
      message(
        Message.FailedLoadWorkspace({ person: 'laxman', message: 'stale' }),
      ),
      model(current => {
        expect(current.workspace._tag).toBe('Loading')
      }),
      message(Message.SucceededLoadWorkspace({ workspace: sraya })),
      model(current => {
        expect(current.workspace).toStrictEqual(
          WorkspaceState.Ready({ workspace: sraya }),
        )
        expect(current.preferences.person).toBe('sraya')
      }),
    )
  })

  test('uses the workspace returned by a child mutation and shows a notice', () => {
    const saved = makeWorkspace('laxman', [makeApplication()])
    story(
      update,
      given(init().model),
      message(Message.SucceededLoadWorkspace({ workspace: laxman })),
      message(
        Message.GotApplicationsMessage({
          message: Applications.Message.SucceededSaveApplication({
            person: 'laxman',
            workspace: saved,
          }),
        }),
      ),
      model(current => {
        expect(current.workspace).toStrictEqual(
          WorkspaceState.Ready({ workspace: saved }),
        )
        expect(current.maybeNotice).toStrictEqual(
          Option.some(Notice.Info({ message: 'Application saved.' })),
        )
      }),
    )
  })

  test('toggles the theme through a command', () => {
    story(
      update,
      given(init().model),
      message(Message.ClickedToggleTheme()),
      model(current => {
        expect(current.theme._tag).toBe('Dark')
      }),
      Command.resolve(ApplyTheme, Message.CompletedApplyTheme()),
    )
  })
})
