import { Array, String } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import type { Job } from '../../domain/index.ts'
import { type Choice, button, select, submitButton, textInput } from '../ui.ts'
import { Message } from './message.ts'
import { JobSave, type Model, Search } from './model.ts'

// VIEW

export type ViewInputs = Readonly<{
  savedSources: ReadonlyArray<string>
}>

type H = HtmlBuilder<Message>

const workModeChoices: ReadonlyArray<Choice> = [
  { value: '', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const searchForm = (model: Model, h: H): Html => {
  const isSearching = Search.match(model.search, {
    NotSearched: () => false,
    Searching: () => true,
    Found: () => false,
    SearchFailed: () => false,
  })
  return h.div(
    [h.Class('discovery panel')],
    [
      h.h2([], ['Find a role worth pursuing.']),
      h.p(
        [h.Class('muted')],
        [
          'Search public tech listings from freehire.me, then save promising roles to your workspace.',
        ],
      ),
      h.form(
        [h.OnSubmit(Message.SubmittedSearch()), h.Class('form')],
        [
          textInput(
            'Job title or skill',
            'query',
            model.query,
            value => Message.UpdatedQuery({ value }),
            h,
          ),
          h.div(
            [h.Class('two-fields')],
            [
              textInput(
                'Country code · e.g. IN',
                'country',
                model.country,
                value => Message.UpdatedCountry({ value }),
                h,
              ),
              select(
                'Work mode',
                'remote',
                model.workMode,
                workModeChoices,
                value => Message.SelectedWorkMode({ value }),
                h,
              ),
            ],
          ),
          submitButton('Search jobs', isSearching, h),
        ],
      ),
    ],
  )
}

const jobCard = (job: Job, isSaved: boolean, isSaving: boolean, h: H): Html => {
  const location = String.isNonEmpty(job.location) ? ` · ${job.location}` : ''
  return h.article(
    [h.Class('job panel')],
    [
      h.div(
        [],
        [
          h.h3([], [job.role]),
          h.p([h.Class('muted')], [`${job.company}${location}`]),
        ],
      ),
      h.div(
        [h.Class('row-actions')],
        [
          h.a(
            [
              h.Href(job.source),
              h.Target('_blank'),
              h.Rel('noopener noreferrer'),
              h.Class('text-link'),
            ],
            ['View posting ↗'],
          ),
          button(
            isSaved ? 'Saved' : 'Save job',
            Message.ClickedSaveJob({ job }),
            h,
            'secondary',
            isSaved || isSaving,
          ),
        ],
      ),
    ],
  )
}

const jobResults = (
  jobs: ReadonlyArray<Job>,
  model: Model,
  savedSources: ReadonlyArray<string>,
  h: H,
): Html => {
  const isSaving = JobSave.match(model.jobSave, {
    Idle: () => false,
    Saving: () => true,
    SaveFailed: () => false,
  })
  return h.div(
    [h.Class('job-results')],
    Array.map(jobs, job =>
      jobCard(job, Array.contains(savedSources, job.source), isSaving, h),
    ),
  )
}

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) =>
    h.section(
      [],
      [
        searchForm(model, h),
        Search.match(model.search, {
          NotSearched: () => h.div([h.Class('job-results')]),
          Searching: () => h.div([h.Class('job-results')]),
          Found: ({ jobs }) =>
            jobResults(jobs, model, viewInputs.savedSources, h),
          SearchFailed: () => h.div([h.Class('job-results')]),
        }),
      ],
    ),
)
