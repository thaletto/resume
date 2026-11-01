import { Array, Effect } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import type { ApplicationInput } from '../domain/index.ts'
import { MAX_BODY_BYTES } from './guard.ts'
import {
  TEST_ORIGIN,
  makeApp,
  makeRpcClient,
  makeTestServices,
} from './testing.ts'

const application: ApplicationInput = {
  company: 'Company, "Research"',
  role: 'Engineer',
  status: 'drafted',
  notes: '<script>data only</script>\nSecond line',
}

const jobs = [
  {
    title: 'Backend Engineer',
    company: 'Acme',
    url: 'https://example.com/jobs/1',
    location: 'Remote',
    description: 'Build services',
  },
]

const respondWithJobs = () => ({ status: 200, body: { data: jobs } })

const setup = Effect.gen(function* () {
  const services = makeTestServices(respondWithJobs)
  const app = yield* makeApp(services.layer)
  return { ...app, requests: services.requests }
})

const rpcMessage = (tag: string, payload: unknown) =>
  JSON.stringify({ _tag: 'Request', id: '1', tag, payload, headers: [] })

const post = (
  body: string,
  headers: Record<string, string> = {},
  host = '127.0.0.1:8765',
) =>
  new Request(`http://${host}/rpc`, {
    method: 'POST',
    headers: {
      host,
      origin: `http://${host}`,
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(body).byteLength),
      ...headers,
    },
    body,
  })

describe('RPC round trip', () => {
  it.effect('persists valid edits and isolates candidates', () =>
    Effect.gen(function* () {
      const { httpClient } = yield* setup
      const client = yield* makeRpcClient(httpClient)
      const saved = yield* client.SaveApplication({
        person: 'laxman',
        application,
      })
      expect(saved.application.notes).toBe(application.notes)
      expect(saved.workspace.profile.name).toBe('Laxman K R')

      const laxman = yield* client.GetWorkspace({ person: 'laxman' })
      const sraya = yield* client.GetWorkspace({ person: 'sraya' })
      expect(laxman.applications).toHaveLength(1)
      expect(laxman.applications[0]?.company).toBe(application.company)
      expect(sraya.applications).toEqual([])
      expect(sraya.profile.name).toBe('Sraya Rajan')

      const preferences = {
        roles: ['Backend Engineer', '  '],
        location: 'Remote',
        languages: 'English',
        salary: '',
        constraints: 'No on-call',
      }
      const updated = yield* client.SavePreferences({
        person: 'sraya',
        preferences,
      })
      expect(updated.preferences.roles).toEqual(['Backend Engineer'])
      expect(
        (yield* client.GetWorkspace({ person: 'laxman' })).preferences.location,
      ).toBe('')
    }).pipe(Effect.scoped),
  )

  it.effect('returns typed domain errors', () =>
    Effect.gen(function* () {
      const { httpClient } = yield* setup
      const client = yield* makeRpcClient(httpClient)
      const first = yield* client.SaveApplication({
        person: 'laxman',
        application: {
          ...application,
          source: 'https://example.com/jobs/1',
        },
      })
      const duplicate = yield* client
        .SaveApplication({
          person: 'laxman',
          application: { ...application, source: first.application.source },
        })
        .pipe(Effect.flip)
      expect(duplicate._tag).toBe('DuplicatePostingError')
      const missing = yield* client
        .UpdateApplicationStatus({
          person: 'sraya',
          id: first.application.id,
          status: 'interview',
        })
        .pipe(Effect.flip)
      expect(missing._tag).toBe('NotFoundError')
      const prepare = yield* client
        .PrepareApplication({ person: 'laxman', id: 'missing' })
        .pipe(Effect.flip)
      expect(prepare._tag).toBe('NotFoundError')
    }).pipe(Effect.scoped),
  )

  it.effect('updates status with history and prepares drafts', () =>
    Effect.gen(function* () {
      const { httpClient } = yield* setup
      const client = yield* makeRpcClient(httpClient)
      const { application: created } = yield* client.SaveApplication({
        person: 'laxman',
        application: { ...application, status: 'saved' },
      })
      const changed = yield* client.UpdateApplicationStatus({
        person: 'laxman',
        id: created.id,
        status: 'interview',
        notes: ' Technical round ',
      })
      expect(
        Array.map(changed.application.history, event => event.status),
      ).toEqual(['saved', 'interview'])
      expect(changed.application.notes).toBe('Technical round')
      expect(changed.workspace.applications).toHaveLength(1)
      const prepared = yield* client.PrepareApplication({
        person: 'laxman',
        id: created.id,
      })
      expect(prepared.path).toContain(created.id)
      expect(prepared.workspace.person).toBe('laxman')
    }).pipe(Effect.scoped),
  )

  it.effect('discovers jobs through the job source', () =>
    Effect.gen(function* () {
      const { httpClient, requests } = yield* setup
      const client = yield* makeRpcClient(httpClient)
      const found = yield* client.DiscoverJobs({
        query: { query: ' backend ', country: 'in', workMode: 'remote' },
      })
      expect(found).toEqual([
        {
          company: 'Acme',
          role: 'Backend Engineer',
          source: 'https://example.com/jobs/1',
          location: 'Remote',
          posting: 'Build services',
        },
      ])
      expect(requests).toHaveLength(1)
      expect(requests[0]?.url).toContain('freehire.me')
    }).pipe(Effect.scoped),
  )
})

describe('RPC boundary', () => {
  it.effect('rejects invalid payloads without touching state', () =>
    Effect.gen(function* () {
      const { send, httpClient } = yield* setup
      const invalid = [
        { status: 'invented' },
        { company: '' },
        { date: '2026-02-30' },
        { source: 'javascript:alert(1)' },
      ]
      yield* Effect.forEach(invalid, change =>
        Effect.gen(function* () {
          const response = yield* send(
            post(
              rpcMessage('SaveApplication', {
                person: 'laxman',
                application: { ...application, ...change },
              }),
            ),
          )
          const body = yield* Effect.promise(() => response.text())
          expect(body).not.toContain('"Success"')
        }),
      )
      const traversal = yield* send(
        post(
          rpcMessage('SaveApplication', { person: '../sraya', application }),
        ),
      )
      expect(yield* Effect.promise(() => traversal.text())).not.toContain(
        '"Success"',
      )
      const client = yield* makeRpcClient(httpClient)
      expect(
        (yield* client.GetWorkspace({ person: 'laxman' })).applications,
      ).toEqual([])
      expect(
        (yield* client.GetWorkspace({ person: 'sraya' })).applications,
      ).toEqual([])
    }).pipe(Effect.scoped),
  )

  it.effect('accepts same-origin JSON and sets security headers', () =>
    Effect.gen(function* () {
      const { send } = yield* setup
      const response = yield* send(
        post(rpcMessage('GetWorkspace', { person: 'laxman' })),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      const body = yield* Effect.promise(() => response.text())
      expect(body).toContain('"Success"')
    }).pipe(Effect.scoped),
  )

  it.effect('rejects non-loopback hosts', () =>
    Effect.gen(function* () {
      const { send } = yield* setup
      const body = rpcMessage('GetWorkspace', { person: 'laxman' })
      const hosts = ['example.com', 'evil.test:8765', '127.0.0.1.evil.test', '']
      yield* Effect.forEach(hosts, host =>
        Effect.gen(function* () {
          const response = yield* send(
            post(body, { host, origin: `http://${host}` }, '127.0.0.1:8765'),
          )
          expect(response.status).toBe(403)
          expect(response.headers.get('cache-control')).toBe('no-store')
        }),
      )
      const localhost = yield* send(post(body, {}, 'localhost:8765'))
      expect(localhost.status).toBe(200)
    }).pipe(Effect.scoped),
  )

  it.effect('rejects cross-origin and non-JSON posts', () =>
    Effect.gen(function* () {
      const { send, httpClient } = yield* setup
      const body = rpcMessage('GetWorkspace', { person: 'laxman' })
      const crossOrigin = yield* send(
        post(body, { origin: 'https://example.com' }),
      )
      expect(crossOrigin.status).toBe(403)
      const mismatchedPort = yield* send(
        post(body, { origin: 'http://127.0.0.1:9999' }),
      )
      expect(mismatchedPort.status).toBe(403)
      const noOrigin = new Request(`${TEST_ORIGIN}/rpc`, {
        method: 'POST',
        headers: {
          host: '127.0.0.1:8765',
          'content-type': 'application/json',
          'content-length': String(body.length),
        },
        body,
      })
      expect((yield* send(noOrigin)).status).toBe(403)
      const form = yield* send(
        post(body, { 'content-type': 'application/x-www-form-urlencoded' }),
      )
      expect(form.status).toBe(403)
      const client = yield* makeRpcClient(httpClient)
      expect(
        (yield* client.GetWorkspace({ person: 'laxman' })).applications,
      ).toEqual([])
    }).pipe(Effect.scoped),
  )

  it.effect('rejects oversize bodies', () =>
    Effect.gen(function* () {
      const { send } = yield* setup
      const padding = 'x'.repeat(MAX_BODY_BYTES + 1)
      const body = rpcMessage('SaveApplication', {
        person: 'laxman',
        application: { ...application, notes: padding },
      })
      const response = yield* send(post(body))
      expect(response.status).toBe(413)
      const declared = yield* send(
        post(rpcMessage('GetWorkspace', { person: 'laxman' }), {
          'content-length': String(MAX_BODY_BYTES + 1),
        }),
      )
      expect(declared.status).toBe(413)
      const unsized = yield* send(
        post(rpcMessage('GetWorkspace', { person: 'laxman' }), {
          'content-length': 'abc',
        }),
      )
      expect(unsized.status).toBe(413)
    }).pipe(Effect.scoped),
  )

  it.effect('does not expose workspace files or unknown routes', () =>
    Effect.gen(function* () {
      const { send } = yield* setup
      const request = (path: string, method = 'GET') =>
        new Request(`http://127.0.0.1:8765${path}`, {
          method,
          headers: { host: '127.0.0.1:8765' },
        })
      const state = yield* send(request('/workspaces/laxman/state.json'))
      expect(state.status).toBe(404)
      const traversal = yield* send(request('/%2e%2e/package.json'))
      expect(traversal.status).toBe(404)
      const api = yield* send(request('/api/state'))
      expect(api.status).toBe(404)
      const rpcGet = yield* send(request('/rpc'))
      expect(rpcGet.status).toBe(404)
      const foreign = yield* send(
        new Request('http://example.com/', {
          headers: { host: 'example.com' },
        }),
      )
      expect(foreign.status).toBe(403)
    }).pipe(Effect.scoped),
  )
})
