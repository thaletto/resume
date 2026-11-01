import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { LoadWorkspace } from './commands.ts'
import { makeApplication, makeWorkspace } from './fixtures.ts'
import { init, update, view } from './main.ts'
import { Message } from './message.ts'
import { WorkspaceState } from './model.ts'
import { SavePreferences } from './preferences/commands.ts'
import * as Preferences from './preferences/index.ts'

const laxman = makeWorkspace('laxman', [makeApplication()])
const sraya = makeWorkspace('sraya')

const readyModel = modifyFields(init().model, {
  workspace: () => WorkspaceState.Ready({ workspace: laxman }),
})

describe('job search shell scene', () => {
  test('candidate preferences are edited, saved and isolated through the Foldkit view', () => {
    const savedWorkspace = makeWorkspace('laxman', [makeApplication()], {
      roles: [],
      location: 'Remote',
      constraints: '',
      languages: '',
      salary: '',
    })
    scene(
      { update, view },
      given(readyModel),
      expect(text('Laxman K R')).toExist(),
      click(role('button', { name: 'Refresh' })),
      expect(text('Loading workspace…')).toExist(),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: laxman }),
      ),
      click(role('button', { name: 'Preferences' })),
      type(label('Preferred location'), 'Remote'),
      click(role('button', { name: 'Save preferences' })),
      Command.expectExact(SavePreferences),
      Command.resolve(
        SavePreferences,
        Preferences.Message.SucceededSavePreferences({
          person: 'laxman',
          workspace: savedWorkspace,
        }),
      ),
      expect(text('Preferences saved to your local workspace.')).toExist(),
      click(role('button', { name: 'Sraya' })),
      expect(text('Loading workspace…')).toExist(),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: sraya }),
      ),
      expect(text('Sraya Rajan')).toExist(),
      expect(text('job-search/workspaces/sraya/state.json')).toExist(),
    )
  })

  test('a failed workspace load can be retried', () => {
    scene(
      { update, view },
      given(readyModel),
      click(role('button', { name: 'Refresh' })),
      Command.resolve(
        LoadWorkspace,
        Message.FailedLoadWorkspace({
          person: 'laxman',
          message: 'Workspace storage failed',
        }),
      ),
      expect(text('Workspace storage failed')).toExist(),
      click(role('button', { name: 'Try again' })),
      expect(text('Loading workspace…')).toExist(),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: laxman }),
      ),
      expect(text('Acme')).toExist(),
    )
  })
})
