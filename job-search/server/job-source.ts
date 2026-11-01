import { Array, Context, Effect, Layer, Option, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'

import {
  type DiscoverQuery,
  type Job,
  JobSourceError,
  OptionalHttpUrl,
} from '../domain/index.ts'

const SEARCH_URL = 'https://freehire.me/api/v1/agent/jobs/search'
const USER_AGENT = 'thaletto/resume-job-search/1.0'
const RESULT_LIMIT = '20'

const Envelope = Schema.Struct({ data: Schema.Array(Schema.Unknown) })

const Result = Schema.Struct({
  title: Schema.String,
  company: Schema.String,
  url: OptionalHttpUrl('Posting URL', 2000),
  location: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
})

const decodeResult = Schema.decodeUnknownOption(Result)

const toJob = (row: typeof Result.Type): Job => ({
  company: row.company,
  role: row.title,
  source: row.url,
  location: row.location ?? '',
  posting: row.description ?? '',
})

const optionalParam = (name: string, value: string) =>
  value === '' ? {} : { [name]: value }

export const searchRequest = (query: DiscoverQuery) =>
  HttpClientRequest.get(SEARCH_URL).pipe(
    HttpClientRequest.setUrlParams({
      q: query.query,
      limit: RESULT_LIMIT,
      description_format: 'text',
      ...optionalParam('countries', query.country),
      ...optionalParam('work_mode', query.workMode),
    }),
    HttpClientRequest.acceptJson,
    HttpClientRequest.setHeader('User-Agent', USER_AGENT),
  )

export class JobSource extends Context.Service<
  JobSource,
  {
    readonly search: (
      query: DiscoverQuery,
    ) => Effect.Effect<ReadonlyArray<Job>, JobSourceError>
  }
>()('job-search/JobSource') {
  static readonly layer: Layer.Layer<JobSource, never, HttpClient.HttpClient> =
    Layer.effect(
      JobSource,
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient

        const search = Effect.fn('JobSource.search')(function* (
          query: DiscoverQuery,
        ) {
          const response = yield* client.execute(searchRequest(query)).pipe(
            Effect.timeout('20 seconds'),
            Effect.mapError(
              () =>
                new JobSourceError({
                  message: 'Job source timed out; try again later',
                }),
            ),
          )
          if (response.status < 200 || response.status >= 300) {
            return yield* new JobSourceError({
              message: `Job source returned ${response.status}; try again later or add a posting manually`,
            })
          }
          const envelope = yield* HttpClientResponse.schemaBodyJson(Envelope)(
            response,
          ).pipe(
            Effect.mapError(
              () =>
                new JobSourceError({
                  message: 'Job source returned an unexpected response',
                }),
            ),
          )
          return Array.getSomes(
            Array.map(envelope.data, row =>
              Option.map(decodeResult(row), toJob),
            ),
          )
        })

        return JobSource.of({ search })
      }),
    )
}
