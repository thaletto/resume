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

import type { Job } from '../../domain/index.ts'
import { makeApplication, makeWorkspace } from '../fixtures.ts'
import { SaveJob, SearchJobs } from './commands.ts'
import { Message, OutMessage } from './message.ts'
import { JobSave, Search } from './model.ts'
import { init, update } from './update.ts'

const job: Job = {
  company: 'Acme',
  role: 'Engineer',
  source: 'https://example.com/jobs/1',
  location: 'Remote',
  posting: 'Build things',
}

describe('discover story', () => {
  test('searches and reports the number of jobs found', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.UpdatedQuery({ value: 'engineer' })),
      message(Message.UpdatedCountry({ value: 'in' })),
      message(Message.SelectedWorkMode({ value: 'remote' })),
      message(Message.SelectedWorkMode({ value: 'nonsense' })),
      message(Message.SubmittedSearch()),
      expectOutMessage(OutMessage.StartedRequest()),
      Command.expectExact(SearchJobs),
      model(current => {
        expect(current.search._tag).toBe('Searching')
        expect(current.workMode).toBe('remote')
      }),
      Command.resolve(
        SearchJobs,
        Message.SucceededSearchJobs({ person: 'laxman', jobs: [job] }),
      ),
      expectOutMessage(OutMessage.FoundJobs({ count: 1 })),
      model(current => {
        expect(current.search).toStrictEqual(Search.Found({ jobs: [job] }))
      }),
    )
  })

  test('reports search failures and allows another search', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.SubmittedSearch()),
      Command.resolve(
        SearchJobs,
        Message.FailedSearchJobs({
          person: 'laxman',
          message: 'Enter a job title or skill to search',
        }),
      ),
      expectOutMessage(
        OutMessage.FailedRequest({
          message: 'Enter a job title or skill to search',
        }),
      ),
      model(current => {
        expect(current.search._tag).toBe('SearchFailed')
      }),
    )
  })

  test('saves a job and reports the updated workspace', () => {
    const workspace = makeWorkspace('laxman', [
      makeApplication({ source: job.source }),
    ])
    story(
      update,
      given(init('laxman')),
      message(Message.ClickedSaveJob({ job })),
      Command.expectExact(SaveJob),
      model(current => {
        expect(current.jobSave._tag).toBe('Saving')
      }),
      Command.resolve(
        SaveJob,
        Message.SucceededSaveJob({ person: 'laxman', workspace }),
      ),
      expectOutMessage(OutMessage.SavedJob({ workspace })),
      model(current => {
        expect(current.jobSave._tag).toBe('Idle')
      }),
    )
  })

  test('does not search or save again while a request is in flight', () => {
    const busy = modifyFields(init('laxman'), {
      search: () => Search.Searching(),
      jobSave: () => JobSave.Saving({ source: job.source }),
    })
    story(
      update,
      given(busy),
      message(Message.SubmittedSearch()),
      message(Message.ClickedSaveJob({ job })),
      Command.expectNone(),
      expectNoOutMessage(),
    )
  })

  test('ignores results for another candidate', () => {
    story(
      update,
      given(init('laxman')),
      message(Message.SubmittedSearch()),
      Command.resolve(
        SearchJobs,
        Message.SucceededSearchJobs({ person: 'sraya', jobs: [job] }),
      ),
      expectNoOutMessage(),
      model(current => {
        expect(current.search._tag).toBe('Searching')
      }),
    )
  })
})
