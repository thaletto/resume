import { defineView } from 'foldkit/submodel'

import { isSubmitting } from '../submission.ts'
import { submitButton, textArea, textInput } from '../ui.ts'
import { Message } from './message.ts'
import type { Model } from './model.ts'

// VIEW

export const view = defineView<Model, Message>((model, h) =>
  h.section(
    [h.Class('preferences panel')],
    [
      h.h2([], ['Define what you’re looking for.']),
      h.p(
        [h.Class('muted')],
        [
          'Only confirmed preferences guide your search. Leave anything unknown blank.',
        ],
      ),
      h.form(
        [h.OnSubmit(Message.SubmittedPreferences()), h.Class('form')],
        [
          textArea(
            'Target roles · one per line',
            'roles',
            model.roles,
            value => Message.UpdatedRoles({ value }),
            h,
          ),
          textInput(
            'Preferred location',
            'location',
            model.location,
            value => Message.UpdatedLocation({ value }),
            h,
          ),
          textInput(
            'Languages and proficiency',
            'languages',
            model.languages,
            value => Message.UpdatedLanguages({ value }),
            h,
          ),
          textInput(
            'Salary expectations',
            'salary',
            model.salary,
            value => Message.UpdatedSalary({ value }),
            h,
          ),
          textArea(
            'Constraints and deal-breakers',
            'constraints',
            model.constraints,
            value => Message.UpdatedConstraints({ value }),
            h,
          ),
          submitButton('Save preferences', isSubmitting(model.submission), h),
        ],
      ),
      h.div(
        [h.Class('storage-note')],
        [
          h.strong([], ['Stored on your machine']),
          h.code([], [`job-search/workspaces/${model.person}/state.json`]),
          h.p(
            [],
            [
              'Preferences are saved under the preferences field. This workspace is Git-ignored.',
            ],
          ),
        ],
      ),
    ],
  ),
)
