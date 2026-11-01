import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { makeWorkspace } from '../fixtures.ts'
import { SavePreferences } from './commands.ts'
import { Message, OutMessage } from './message.ts'
import { init, update } from './update.ts'

const preferences = {
  roles: ['Platform engineer', 'Staff engineer'],
  location: 'Remote',
  constraints: 'No on-call',
  languages: 'English',
  salary: '',
}

describe('preferences story', () => {
  test('fills the form from the loaded workspace', () => {
    story(
      update,
      given(init('laxman')),
      message(
        Message.UpdatedWorkspace({
          workspace: makeWorkspace('laxman', [], preferences),
        }),
      ),
      model(current => {
        expect(current.roles).toBe('Platform engineer\nStaff engineer')
        expect(current.location).toBe('Remote')
      }),
      message(
        Message.UpdatedWorkspace({
          workspace: makeWorkspace('sraya', [], {
            ...preferences,
            location: 'Elsewhere',
          }),
        }),
      ),
      model(current => {
        expect(current.location).toBe('Remote')
      }),
    )
  })

  test('submits the edited form and reports the saved workspace', () => {
    const saved = makeWorkspace('laxman', [], { ...preferences, salary: '1' })
    story(
      update,
      given(init('laxman')),
      message(Message.UpdatedLocation({ value: 'Hybrid' })),
      message(Message.UpdatedSalary({ value: '1' })),
      message(Message.SubmittedPreferences()),
      expectOutMessage(OutMessage.StartedRequest()),
      Command.expectExact(SavePreferences),
      model(current => {
        expect(current.submission._tag).toBe('Submitting')
      }),
      Command.resolve(
        SavePreferences,
        Message.SucceededSavePreferences({
          person: 'laxman',
          workspace: saved,
        }),
      ),
      expectOutMessage(OutMessage.SavedPreferences({ workspace: saved })),
      model(current => {
        expect(current.submission._tag).toBe('Idle')
        expect(current.location).toBe('Remote')
      }),
    )
  })

  test('reports validation failures and stays editable', () => {
    story(
      update,
      given(init('sraya')),
      message(Message.SubmittedPreferences()),
      Command.resolve(
        SavePreferences,
        Message.FailedSavePreferences({
          person: 'sraya',
          message: 'Provide up to 20 target roles',
        }),
      ),
      expectOutMessage(
        OutMessage.FailedRequest({ message: 'Provide up to 20 target roles' }),
      ),
      model(current => {
        expect(current.submission._tag).toBe('SubmitFailed')
      }),
    )
  })
})
