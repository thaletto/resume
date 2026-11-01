import { Effect, Fiber, Layer } from 'effect'
import { HttpClient, HttpClientResponse, UrlParams } from 'effect/http'
import { TestClock } from 'effect/testing'

import { describe, expect, it } from '@effect/vitest'

import { JobSource } from './job-source.ts'
import { makeFakeHttpClient } from './testing.ts'

const query = { query: 'backend', country: 'IN', workMode: 'remote' } as const

const withSource = (respond: Parameters<typeof makeFakeHttpClient>[0]) => {
  const fake = makeFakeHttpClient(respond)
  return {
    requests: fake.requests,
    layer: JobSource.layer.pipe(Layer.provide(fake.layer)),
  }
}

const row = (overrides: Record<string, unknown>) => ({
  title: 'Engineer',
  company: 'Acme',
  url: 'https://example.com/jobs/1',
  ...overrides,
})

describe('JobSource', () => {
  it.effect('sends the documented request without touching the network', () => {
    const { requests, layer } = withSource(() => ({
      status: 200,
      body: { data: [] },
    }))
    return Effect.gen(function* () {
      const source = yield* JobSource
      yield* source.search(query)
      expect(requests).toHaveLength(1)
      const request = requests[0]
      const url = new URL(request?.url ?? '')
      expect(url.origin + url.pathname).toBe(
        'https://freehire.me/api/v1/agent/jobs/search',
      )
      const params = UrlParams.toRecord(request?.urlParams ?? UrlParams.empty)
      expect(params).toEqual({
        q: 'backend',
        limit: '20',
        description_format: 'text',
        countries: 'IN',
        work_mode: 'remote',
      })
      expect(request?.headers['user-agent']).toBe(
        'thaletto/resume-job-search/1.0',
      )
      expect(request?.method).toBe('GET')
    }).pipe(Effect.provide(layer))
  })

  it.effect('omits empty country and work mode', () => {
    const { requests, layer } = withSource(() => ({
      status: 200,
      body: { data: [] },
    }))
    return Effect.gen(function* () {
      const source = yield* JobSource
      yield* source.search({ query: 'data', country: '', workMode: '' })
      const names = Object.keys(
        UrlParams.toRecord(requests[0]?.urlParams ?? UrlParams.empty),
      )
      expect(names).toEqual(['q', 'limit', 'description_format'])
    }).pipe(Effect.provide(layer))
  })

  it.effect('maps rows and drops undecodable or non-http rows', () => {
    const { layer } = withSource(() => ({
      status: 200,
      body: {
        data: [
          row({ location: 'Remote', description: 'Details' }),
          row({ url: 'https://Example.com/jobs/2?id=1', title: 'Second' }),
          row({ url: 'javascript:alert(1)' }),
          row({ url: 'ftp://example.com/job' }),
          row({ url: 'not a url' }),
          { title: 'No company' },
          'garbage',
          null,
        ],
      },
    }))
    return Effect.gen(function* () {
      const source = yield* JobSource
      const jobs = yield* source.search(query)
      expect(jobs).toEqual([
        {
          company: 'Acme',
          role: 'Engineer',
          source: 'https://example.com/jobs/1',
          location: 'Remote',
          posting: 'Details',
        },
        {
          company: 'Acme',
          role: 'Second',
          source: 'https://example.com/jobs/2?id=1',
          location: '',
          posting: '',
        },
      ])
    }).pipe(Effect.provide(layer))
  })

  it.effect('reports upstream HTTP failures', () => {
    const { layer } = withSource(() => ({ status: 503, body: {} }))
    return Effect.gen(function* () {
      const source = yield* JobSource
      const error = yield* source.search(query).pipe(Effect.flip)
      expect(error._tag).toBe('JobSourceError')
      expect(error.message).toContain('503')
    }).pipe(Effect.provide(layer))
  })

  it.effect('reports unexpected response shapes', () => {
    const { layer } = withSource(() => ({
      status: 200,
      body: { results: [] },
    }))
    return Effect.gen(function* () {
      const source = yield* JobSource
      const error = yield* source.search(query).pipe(Effect.flip)
      expect(error.message).toBe('Job source returned an unexpected response')
    }).pipe(Effect.provide(layer))
  })

  it.effect('reports timeouts', () => {
    const never = HttpClient.make(() => Effect.never)
    const layer = JobSource.layer.pipe(
      Layer.provide(Layer.succeed(HttpClient.HttpClient)(never)),
    )
    return Effect.gen(function* () {
      const source = yield* JobSource
      const fiber = yield* Effect.forkChild(
        source.search(query).pipe(Effect.flip),
      )
      yield* TestClock.adjust('21 seconds')
      const error = yield* Fiber.join(fiber)
      expect(error.message).toBe('Job source timed out; try again later')
    }).pipe(Effect.provide(layer))
  })

  it.effect('fails with a job source error for transport failures', () => {
    const failing = HttpClient.make(request =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response('not json', { status: 200 }),
        ),
      ),
    )
    const layer = JobSource.layer.pipe(
      Layer.provide(Layer.succeed(HttpClient.HttpClient)(failing)),
    )
    return Effect.gen(function* () {
      const source = yield* JobSource
      const error = yield* source.search(query).pipe(Effect.flip)
      expect(error._tag).toBe('JobSourceError')
    }).pipe(Effect.provide(layer))
  })
})
