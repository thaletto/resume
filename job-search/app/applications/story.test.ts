import { Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { makeApplication, makeWorkspace } from '../fixtures.ts'
import { Submission } from '../submission.ts'
import {
  FocusEditorField,
  PrepareApplication,
  SaveApplication,
} from './commands.ts'
import { Message, OutMessage } from './message.ts'
import { Editor, Preparation, blankDraft } from './model.ts'
import { init, update } from './update.ts'

const application = makeApplication()
const workspace = makeWorkspace('laxman', [application])
const preparedPath = 'job-search/workspaces/laxman/applications/acme-engineer'

describe('applications story', () => {
  test('opens a blank editor and updates draft fields', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedAddApplication()),
      Command.resolve(FocusEditorField, Message.CompletedFocusEditorField()),
      message(Message.UpdatedCompany({ value: 'Acme' })),
      message(Message.SelectedStatus({ value: 'applied' })),
      message(Message.SelectedStatus({ value: 'nonsense' })),
      model(current => {
        expect(current.editor).toStrictEqual(
          Editor.Editing({
            draft: { ...blankDraft(), company: 'Acme', status: 'applied' },
          }),
        )
      }),
    )
  })

  test('saves a draft, closes the editor and reports the workspace', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedAddApplication()),
      Command.resolve(FocusEditorField, Message.CompletedFocusEditorField()),
      message(Message.UpdatedCompany({ value: 'Acme' })),
      message(Message.SubmittedApplication()),
      expectOutMessage(OutMessage.StartedRequest()),
      Command.expectExact(SaveApplication),
      Command.resolve(
        SaveApplication,
        Message.SucceededSaveApplication({ person: 'laxman', workspace }),
      ),
      expectOutMessage(OutMessage.SavedApplication({ workspace })),
      model(current => {
        expect(current.editor).toStrictEqual(Editor.Closed())
        expect(current.submission._tag).toBe('Idle')
      }),
    )
  })

  test('keeps the editor open and focuses the first invalid field when saving fails', () => {
    const fieldErrors = [{ field: 'role', message: 'Role is required' }]
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedEditApplication({ application })),
      Command.resolve(FocusEditorField, Message.CompletedFocusEditorField()),
      message(Message.SubmittedApplication()),
      Command.resolve(
        SaveApplication,
        Message.FailedSaveApplication({
          person: 'laxman',
          message: 'Role is required',
          fieldErrors,
        }),
      ),
      Command.expectExact(FocusEditorField({ id: 'application-role' })),
      Command.resolve(FocusEditorField, Message.CompletedFocusEditorField()),
      model(current => {
        expect(current.editor._tag).toBe('Editing')
        expect(current.submission).toStrictEqual(
          Submission.SubmitFailed({ message: 'Role is required', fieldErrors }),
        )
      }),
    )
  })

  test('ignores results for another candidate', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedEditApplication({ application })),
      Command.resolve(FocusEditorField, Message.CompletedFocusEditorField()),
      message(Message.SubmittedApplication()),
      Command.resolve(
        SaveApplication,
        Message.SucceededSaveApplication({
          person: 'sraya',
          workspace: makeWorkspace('sraya'),
        }),
      ),
      model(current => {
        expect(current.submission._tag).toBe('Submitting')
        expect(current.editor._tag).toBe('Editing')
      }),
    )
  })

  test('does not submit or prepare again while a request is in flight', () => {
    const busy = modifyFields(init('laxman'), {
      editor: () => Editor.Editing({ draft: blankDraft() }),
      submission: () => Submission.Submitting(),
      preparation: () => Preparation.Preparing({ id: application.id }),
    })
    story(
      update,
      given(busy),
      message(Message.SubmittedApplication()),
      message(Message.ClickedPrepareApplication({ id: application.id })),
      message(Message.ClickedCloseEditor()),
      Command.expectNone(),
      expectNoOutMessage(),
      model(current => {
        expect(current.editor._tag).toBe('Editing')
      }),
    )
  })

  test('filters by status and requests a refresh', () => {
    story(
      update,
      given(init('sraya')),
      message(Message.SelectedStatusFilter({ value: 'offer' })),
      model(current => {
        expect(current.maybeStatusFilter).toStrictEqual(Option.some('offer'))
      }),
      message(Message.SelectedStatusFilter({ value: '' })),
      model(current => {
        expect(Option.isNone(current.maybeStatusFilter)).toBe(true)
      }),
      message(Message.ClickedRefresh()),
      expectOutMessage(OutMessage.RequestedRefresh()),
    )
  })

  test('prepares a draft folder once at a time', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedPrepareApplication({ id: application.id })),
      Command.expectExact(PrepareApplication),
      model(current => {
        expect(current.preparation).toStrictEqual(
          Preparation.Preparing({ id: application.id }),
        )
      }),
      Command.resolve(
        PrepareApplication,
        Message.SucceededPrepareApplication({
          person: 'laxman',
          path: preparedPath,
          workspace,
        }),
      ),
      expectOutMessage(
        OutMessage.PreparedApplication({ path: preparedPath, workspace }),
      ),
      model(current => {
        expect(current.preparation._tag).toBe('Idle')
      }),
    )
  })
})
