import { Option, Schema } from 'effect'
import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { WorkModeFilter } from '../../domain/index.ts'
import type { Job, Person } from '../../domain/index.ts'
import { SaveJob, SearchJobs } from './commands.ts'
import { Message, OutMessage } from './message.ts'
import { JobSave, Model, Search } from './model.ts'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

// INIT

export const init = (person: Person): Model => ({
  person,
  query: '',
  country: '',
  workMode: '',
  search: Search.NotSearched(),
  jobSave: JobSave.Idle(),
})

// UPDATE

const decodeWorkMode = Schema.decodeUnknownOption(WorkModeFilter)

const startSearch = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { search: () => Search.Searching() }),
  commands: [
    SearchJobs({
      person: model.person,
      query: model.query,
      country: model.country,
      workMode: model.workMode,
    }),
  ],
  outMessage: OutMessage.StartedRequest(),
})

const submitSearch = (model: Model): UpdateReturn =>
  Search.match<UpdateReturn>(model.search, {
    Searching: () => ({ model }),
    NotSearched: () => startSearch(model),
    Found: () => startSearch(model),
    SearchFailed: () => startSearch(model),
  })

const startSavingJob = (model: Model, job: Job): UpdateReturn => ({
  model: modifyFields(model, {
    jobSave: () => JobSave.Saving({ source: job.source }),
  }),
  commands: [SaveJob({ person: model.person, job })],
  outMessage: OutMessage.StartedRequest(),
})

const saveJob = (model: Model, job: Job): UpdateReturn =>
  JobSave.match<UpdateReturn>(model.jobSave, {
    Saving: () => ({ model }),
    Idle: () => startSavingJob(model, job),
    SaveFailed: () => startSavingJob(model, job),
  })

const ignoreOtherPerson = (
  model: Model,
  person: Person,
  respond: () => UpdateReturn,
): UpdateReturn => {
  if (person !== model.person) {
    return { model }
  }
  return respond()
}

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, { query: () => value }),
    }),
    UpdatedCountry: ({ value }) => ({
      model: modifyFields(model, { country: () => value }),
    }),
    SelectedWorkMode: ({ value }) =>
      Option.match(decodeWorkMode(value), {
        onNone: () => ({ model }),
        onSome: workMode => ({
          model: modifyFields(model, { workMode: () => workMode }),
        }),
      }),
    SubmittedSearch: () => submitSearch(model),
    SucceededSearchJobs: ({ person, jobs }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, { search: () => Search.Found({ jobs }) }),
        outMessage: OutMessage.FoundJobs({ count: jobs.length }),
      })),
    FailedSearchJobs: ({ person, message: failure }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, {
          search: () => Search.SearchFailed({ message: failure }),
        }),
        outMessage: OutMessage.FailedRequest({ message: failure }),
      })),
    ClickedSaveJob: ({ job }) => saveJob(model, job),
    SucceededSaveJob: ({ person, workspace }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, { jobSave: () => JobSave.Idle() }),
        outMessage: OutMessage.SavedJob({ workspace }),
      })),
    FailedSaveJob: ({ person, message: failure }) =>
      ignoreOtherPerson(model, person, () => ({
        model: modifyFields(model, {
          jobSave: () => JobSave.SaveFailed({ message: failure }),
        }),
        outMessage: OutMessage.FailedRequest({ message: failure }),
      })),
  })
