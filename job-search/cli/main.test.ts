import { Array, Effect, FileSystem, Path } from 'effect'
import { Command } from 'effect/cli'

import { describe, expect, it } from '@effect/vitest'

import { Store } from '../state/store.ts'
import { TestStore } from '../state/testing.ts'
import { WorkspaceConfig } from '../state/workspace-config.ts'
import { root } from './main.ts'

const runCli = (args: ReadonlyArray<string>) =>
  Command.runWith(root, { version: 'test' })(args)

const writeJson = (name: string, value: unknown) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: 'resume-cli-',
    })
    const target = path.join(directory, name)
    yield* fileSystem.writeFileString(target, JSON.stringify(value))
    return target
  })

const application = {
  company: 'Acme',
  role: 'Engineer',
  status: 'saved',
  source: 'https://example.com/jobs/1',
}

describe('job-search CLI', () => {
  it.effect('initialises one candidate or all of them', () =>
    Effect.gen(function* () {
      const config = yield* WorkspaceConfig
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      yield* runCli(['init', 'laxman'])
      expect(
        yield* fileSystem.exists(
          path.join(config.workspacePath('laxman'), 'state.json'),
        ),
      ).toBe(true)
      expect(yield* fileSystem.exists(config.workspacePath('sraya'))).toBe(
        false,
      )
      yield* runCli(['init', 'all'])
      expect(
        yield* fileSystem.exists(
          path.join(config.workspacePath('sraya'), 'master.tex'),
        ),
      ).toBe(true)
    }).pipe(Effect.provide(TestStore)),
  )

  it.effect('saves, changes status and prepares an application', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const file = yield* writeJson('application.json', application)
      yield* runCli(['save', 'laxman', '--file', file])
      const [saved] = (yield* store.read('laxman')).applications
      expect(saved?.company).toBe('Acme')
      const id = saved?.id ?? ''
      yield* runCli([
        'status',
        'laxman',
        id,
        '--status',
        'interview',
        '--notes',
        'Technical round',
      ])
      const [updated] = (yield* store.read('laxman')).applications
      expect(Array.map(updated?.history ?? [], event => event.status)).toEqual([
        'saved',
        'interview',
      ])
      expect(updated?.notes).toBe('Technical round')
      expect(updated?.source).toBe('https://example.com/jobs/1')
      yield* runCli(['prepare', 'laxman', id])
      const config = yield* WorkspaceConfig
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const brief = path.join(
        config.workspacePath('laxman'),
        'applications',
        id,
        'brief.md',
      )
      expect(yield* fileSystem.exists(brief)).toBe(true)
    }).pipe(Effect.scoped, Effect.provide(TestStore)),
  )

  it.effect('fails with a readable message for invalid input', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const bad = yield* writeJson('bad.json', {
        ...application,
        status: 'invented',
      })
      const invalid = yield* runCli(['save', 'laxman', '--file', bad]).pipe(
        Effect.flip,
      )
      expect(invalid).toMatchObject({
        _tag: 'ValidationError',
        message: 'Choose a valid status',
      })
      const missing = yield* runCli([
        'status',
        'laxman',
        'missing',
        '--status',
        'applied',
      ]).pipe(Effect.flip)
      expect(missing).toMatchObject({ _tag: 'NotFoundError' })
      const unreadable = yield* runCli([
        'save',
        'laxman',
        '--file',
        'nope.json',
      ]).pipe(Effect.flip)
      expect(unreadable).toMatchObject({ _tag: 'ValidationError' })
      expect((yield* store.read('laxman')).applications).toEqual([])
    }).pipe(Effect.scoped, Effect.provide(TestStore)),
  )

  it.effect('rejects unknown candidates and statuses at parse time', () =>
    Effect.gen(function* () {
      const person = yield* runCli(['list', 'nobody']).pipe(Effect.flip)
      expect(person._tag).toBe('ShowHelp')
      const status = yield* runCli([
        'status',
        'laxman',
        'some-id',
        '--status',
        'bogus',
      ]).pipe(Effect.flip)
      expect(status._tag).toBe('ShowHelp')
    }).pipe(Effect.provide(TestStore)),
  )
})
