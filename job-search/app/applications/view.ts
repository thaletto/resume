import { Array, Option, Order, String } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import {
  type Application,
  STATUSES,
  type Status,
  statusLabel,
} from '../../domain/index.ts'
import { isSubmitting } from '../submission.ts'
import {
  type Choice,
  button,
  select,
  submitButton,
  textArea,
  textInput,
} from '../ui.ts'
import { Message } from './message.ts'
import { type Draft, Editor, type Model, Preparation } from './model.ts'

// VIEW

export type ViewInputs = Readonly<{
  applications: ReadonlyArray<Application>
}>

type H = HtmlBuilder<Message>

type PipelineStage = Readonly<{
  label: string
  statuses: ReadonlyArray<Status>
}>

const PIPELINE_STAGES: ReadonlyArray<PipelineStage> = [
  { label: 'Saved / drafts', statuses: ['saved', 'drafted'] },
  { label: 'Applied', statuses: ['applied'] },
  { label: 'Interviews', statuses: ['interview'] },
  { label: 'Offers', statuses: ['offer'] },
  { label: 'Hired', statuses: ['hired'] },
]

const statusChoices: ReadonlyArray<Choice> = Array.map(STATUSES, status => ({
  value: status,
  label: statusLabel(status),
}))

const statusFilterChoices: ReadonlyArray<Choice> = [
  { value: '', label: 'All statuses' },
  ...statusChoices,
]

const matchesFilters = (model: Model, application: Application): boolean => {
  const matchesStatus = Option.match(model.maybeStatusFilter, {
    onNone: () => true,
    onSome: status => application.status === status,
  })
  const matchesSearch = String.includes(String.toLowerCase(model.search))(
    String.toLowerCase(`${application.company} ${application.role}`),
  )
  return matchesStatus && matchesSearch
}

const newestFirst = Order.flip(
  Order.mapInput(
    Order.String,
    (application: Application) => application.updatedAt,
  ),
)

const applicationForm = (draft: Draft, model: Model, h: H): Html => {
  const isWorking = isSubmitting(model.submission)
  const heading = draft.id === '' ? 'New application' : 'Edit application'
  return h.aside(
    [h.Class('editor panel')],
    [
      h.div(
        [h.Class('section-heading')],
        [
          h.h2([], [heading]),
          button('Close', Message.ClickedCloseEditor(), h, 'ghost', isWorking),
        ],
      ),
      h.form(
        [h.OnSubmit(Message.SubmittedApplication()), h.Class('form')],
        [
          textInput(
            'Company',
            'application-company',
            draft.company,
            value => Message.UpdatedCompany({ value }),
            h,
          ),
          textInput(
            'Role',
            'application-role',
            draft.role,
            value => Message.UpdatedRole({ value }),
            h,
          ),
          select(
            'Status',
            'application-status',
            draft.status,
            statusChoices,
            value => Message.SelectedStatus({ value }),
            h,
          ),
          h.p(
            [h.Class('hint')],
            ['Choose Applied only after you submit the application.'],
          ),
          h.div(
            [h.Class('two-fields')],
            [
              textInput(
                'Date',
                'application-date',
                draft.date,
                value => Message.UpdatedDate({ value }),
                h,
                'date',
              ),
              textInput(
                'Deadline',
                'application-deadline',
                draft.deadline,
                value => Message.UpdatedDeadline({ value }),
                h,
                'date',
              ),
            ],
          ),
          textInput(
            'Posting URL',
            'application-source',
            draft.source,
            value => Message.UpdatedSource({ value }),
            h,
            'url',
          ),
          textInput(
            'Location',
            'application-location',
            draft.location,
            value => Message.UpdatedLocation({ value }),
            h,
          ),
          textArea(
            'Job description',
            'application-posting',
            draft.posting,
            value => Message.UpdatedPosting({ value }),
            h,
          ),
          textArea(
            'Notes',
            'application-notes',
            draft.notes,
            value => Message.UpdatedNotes({ value }),
            h,
          ),
          submitButton('Save application', isWorking, h),
        ],
      ),
    ],
  )
}

const historyView = (application: Application, h: H): Html =>
  h.details(
    [h.Class('history')],
    [
      h.summary([], ['History']),
      ...Array.map(application.history, event => {
        const notes = String.isNonEmpty(event.notes) ? `: ${event.notes}` : ''
        return h.p(
          [],
          [
            `${String.slice(0, 10)(event.date)} · ${statusLabel(event.status)}${notes}`,
          ],
        )
      }),
    ],
  )

const optionalView = (isShown: boolean, view: () => Html, h: H): Html => {
  if (isShown) {
    return view()
  }
  return h.empty
}

const applicationRow = (
  application: Application,
  isBusy: boolean,
  h: H,
): Html =>
  h.keyed('tr')(
    application.id,
    [],
    [
      h.td(
        [],
        [
          h.strong([], [application.company]),
          h.p([h.Class('muted')], [application.role]),
          optionalView(
            String.isNonEmpty(application.location),
            () => h.small([h.Class('muted')], [application.location]),
            h,
          ),
        ],
      ),
      h.td(
        [],
        [
          h.span(
            [h.Class(`badge ${application.status}`)],
            [statusLabel(application.status)],
          ),
          optionalView(
            application.history.length > 1,
            () => historyView(application, h),
            h,
          ),
        ],
      ),
      h.td(
        [],
        [String.isNonEmpty(application.deadline) ? application.deadline : '—'],
      ),
      h.td(
        [],
        [
          h.div(
            [h.Class('row-actions')],
            [
              button(
                'Edit',
                Message.ClickedEditApplication({ application }),
                h,
                'ghost',
                isBusy,
              ),
              button(
                'Prepare drafts',
                Message.ClickedPrepareApplication({ id: application.id }),
                h,
                'ghost',
                isBusy,
              ),
              optionalView(
                String.isNonEmpty(application.source),
                () =>
                  h.a(
                    [
                      h.Href(application.source),
                      h.Target('_blank'),
                      h.Rel('noopener noreferrer'),
                      h.Class('text-link'),
                    ],
                    ['Posting ↗'],
                  ),
                h,
              ),
            ],
          ),
          optionalView(
            String.isNonEmpty(application.notes),
            () => h.p([h.Class('row-notes')], [application.notes]),
            h,
          ),
        ],
      ),
    ],
  )

const applicationsTable = (
  applications: ReadonlyArray<Application>,
  isBusy: boolean,
  h: H,
): Html =>
  h.table(
    [],
    [
      h.thead(
        [],
        [
          h.tr(
            [],
            Array.map(
              ['Company & role', 'Status', 'Deadline', 'Actions'],
              label => h.th([], [label]),
            ),
          ),
        ],
      ),
      h.tbody(
        [],
        Array.map(applications, application =>
          applicationRow(application, isBusy, h),
        ),
      ),
    ],
  )

const emptyApplications = (hasApplications: boolean, h: H): Html => {
  const heading = hasApplications
    ? 'No matching applications'
    : 'Your next role starts here.'
  const hint = hasApplications
    ? 'Try another search or status.'
    : 'Save a job from discovery or add a posting to start your application workspace.'
  return h.div(
    [h.Class('empty')],
    [
      h.h2([], [heading]),
      h.p([], [hint]),
      button('Add application', Message.ClickedAddApplication(), h, 'primary'),
    ],
  )
}

const stageCount = (
  applications: ReadonlyArray<Application>,
  stage: PipelineStage,
): string => {
  const inStage = Array.filter(applications, application =>
    Array.contains(stage.statuses, application.status),
  )
  return `${Array.length(inStage)}`
}

const pipelineView = (applications: ReadonlyArray<Application>, h: H): Html =>
  h.div(
    [h.Class('pipeline')],
    Array.map(PIPELINE_STAGES, stage =>
      h.div(
        [h.Class('stage')],
        [
          h.strong([], [stageCount(applications, stage)]),
          h.span([], [stage.label]),
        ],
      ),
    ),
  )

const agentNote = (model: Model, h: H): Html =>
  h.div(
    [h.Class('agent-note')],
    [
      h.h3([], ['Work with your agent']),
      h.code(
        [],
        [`bun run job-search launch ${model.person} --agent opencode`],
      ),
      h.p(
        [],
        [
          'Prepare an application’s draft folder, then ask your agent to evaluate the role, tailor your CV or prepare for an interview.',
        ],
      ),
    ],
  )

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) => {
    const applications = Array.sort(
      Array.filter(viewInputs.applications, application =>
        matchesFilters(model, application),
      ),
      newestFirst,
    )
    const isBusy =
      isSubmitting(model.submission) ||
      Preparation.match(model.preparation, {
        Idle: () => false,
        Preparing: () => true,
      })
    return h.div(
      [h.Class('applications-layout')],
      [
        h.section(
          [h.Class('application-main')],
          [
            pipelineView(viewInputs.applications, h),
            h.div(
              [h.Class('toolbar')],
              [
                textInput(
                  'Search applications',
                  'search',
                  model.search,
                  value => Message.UpdatedSearch({ value }),
                  h,
                  'search',
                ),
                select(
                  'Status',
                  'filter',
                  Option.getOrElse(model.maybeStatusFilter, () => ''),
                  statusFilterChoices,
                  value => Message.SelectedStatusFilter({ value }),
                  h,
                ),
                button('Refresh', Message.ClickedRefresh(), h),
              ],
            ),
            h.div(
              [h.Class('table-panel panel')],
              [
                Array.match(applications, {
                  onEmpty: () =>
                    emptyApplications(
                      Array.isReadonlyArrayNonEmpty(viewInputs.applications),
                      h,
                    ),
                  onNonEmpty: rows => applicationsTable(rows, isBusy, h),
                }),
              ],
            ),
            agentNote(model, h),
          ],
        ),
        Editor.match(model.editor, {
          Closed: () => h.empty,
          Editing: ({ draft }) => applicationForm(draft, model, h),
        }),
      ],
    )
  },
)
