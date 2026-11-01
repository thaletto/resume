import { Effect } from 'effect'

import { JobSearchRpcs } from '../domain/index.ts'
import { JobSource } from './job-source.ts'
import { Store } from './store.ts'

export const JobSearchHandlers = JobSearchRpcs.toLayer(
  Effect.gen(function* () {
    const store = yield* Store
    const jobSource = yield* JobSource
    return JobSearchRpcs.of({
      GetWorkspace: ({ person }) => store.workspace(person),
      SaveApplication: ({ person, application }) =>
        store.saveApplication(person, application),
      UpdateApplicationStatus: update => store.updateStatus(update),
      SavePreferences: ({ person, preferences }) =>
        store.savePreferences(person, preferences),
      PrepareApplication: ({ person, id }) => store.prepare(person, id),
      DiscoverJobs: ({ query }) => jobSource.search(query),
    })
  }),
)
