import { Array, Effect, FileSystem, Path } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import type { ApplicationInput, PreferencesInput } from '../domain/index.ts'
import { Store } from './store.ts'
import { TestStore } from './testing.ts'
import { WorkspaceConfig } from './workspace-config.ts'

const provideStore = Effect.provide(TestStore)

const draft = (overrides: Partial<ApplicationInput>): ApplicationInput => ({
  company: 'Company',
  role: 'Engineer',
  status: 'saved',
  ...overrides,
})

const preferences: PreferencesInput = {
  roles: ['Backend Engineer'],
  location: 'Remote',
  languages: 'English',
  salary: '',
  constraints: '',
}

describe('Store initialization', () => {
  it.effect('preserves evidence and confirmed preferences', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const config = yield* WorkspaceConfig
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      yield* store.initialize('laxman')
      yield* store.initialize('sraya')
      const master = path.join(config.workspacePath('sraya'), 'master.tex')
      const copied = yield* fileSystem.readFileString(master)
      expect(copied).toContain('Sraya Rajan')
      expect(copied).not.toContain('Laxman K R')
      yield* fileSystem.writeFileString(master, 'Candidate-confirmed evidence')
      yield* store.savePreferences('sraya', preferences)
      yield* store.initialize('sraya')
      expect(yield* fileSystem.readFileString(master)).toBe(
        'Candidate-confirmed evidence',
      )
      expect((yield* store.read('sraya')).preferences.location).toBe('Remote')
      expect((yield* store.read('laxman')).preferences.roles).toEqual([])
    }).pipe(provideStore),
  )

  it.effect(
    'creates the workspace layout and keeps existing instructions',
    () =>
      Effect.gen(function* () {
        const store = yield* Store
        const config = yield* WorkspaceConfig
        const fileSystem = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const directory = yield* store.initialize('laxman')
        expect(directory).toBe(config.workspacePath('laxman'))
        expect(
          yield* fileSystem.exists(path.join(directory, 'applications')),
        ).toBe(true)
        const agents = path.join(directory, 'AGENTS.md')
        yield* fileSystem.writeFileString(agents, 'Custom instructions\n')
        yield* store.initialize('laxman')
        expect(yield* fileSystem.readFileString(agents)).toBe(
          'Custom instructions\n',
        )
        const claude = yield* fileSystem.readFileString(
          path.join(directory, 'CLAUDE.md'),
        )
        expect(claude).toContain('bun ../../cli/main.ts list laxman')
        expect(claude).toContain('This workspace belongs only to laxman.')
      }).pipe(provideStore),
  )

  it.effect('rewrites the legacy CLI path and nothing else', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const config = yield* WorkspaceConfig
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const directory = config.workspacePath('sraya')
      yield* fileSystem.makeDirectory(directory, { recursive: true })
      const legacy = [
        '# Job search: Sraya Rajan',
        'Edited by the candidate.',
        'From this directory: bun ../../src/cli.ts list sraya',
        'Also run bun ../../src/cli.ts doctor',
        '',
      ].join('\n')
      yield* Effect.forEach(['AGENTS.md', 'CLAUDE.md'], file =>
        fileSystem.writeFileString(path.join(directory, file), legacy),
      )
      yield* store.initialize('sraya')
      const migrated = [
        '# Job search: Sraya Rajan',
        'Edited by the candidate.',
        'From this directory: bun ../../cli/main.ts list sraya',
        'Also run bun ../../cli/main.ts doctor',
        '',
      ].join('\n')
      const agents = yield* fileSystem.readFileString(
        path.join(directory, 'AGENTS.md'),
      )
      const claude = yield* fileSystem.readFileString(
        path.join(directory, 'CLAUDE.md'),
      )
      expect(agents).toBe(migrated)
      expect(claude).toBe(migrated)
    }).pipe(provideStore),
  )

  it.effect('rejects invalid stored state', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const config = yield* WorkspaceConfig
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const directory = yield* store.initialize('laxman')
      yield* fileSystem.writeFileString(
        path.join(directory, 'state.json'),
        '{"version":2}',
      )
      const error = yield* store.initialize('laxman').pipe(Effect.flip)
      expect(error._tag).toBe('StorageError')
      expect(error.message).toContain('Invalid workspace data')
      expect(config.directory).toContain('resume-test-')
    }).pipe(provideStore),
  )
})

describe('Store applications', () => {
  it.effect('keeps identity, status history and draft folders', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const first = (yield* store.saveApplication(
        'laxman',
        draft({
          source: 'https://example.com/jobs/1',
          posting: 'Full requirements',
        }),
      )).application
      const second = (yield* store.saveApplication(
        'laxman',
        draft({ source: 'https://example.com/jobs/2' }),
      )).application
      expect(first.id).not.toBe(second.id)

      const duplicate = yield* store
        .saveApplication('laxman', draft({ source: first.source }))
        .pipe(Effect.flip)
      expect(duplicate._tag).toBe('DuplicatePostingError')
      expect(duplicate.message).toContain('already saved')

      yield* store.saveApplication(
        'laxman',
        draft({ id: first.id, status: 'interview', notes: 'Technical round' }),
      )
      const final = (yield* store.saveApplication(
        'laxman',
        draft({ id: first.id, status: 'rejected', notes: 'After interview' }),
      )).application
      expect(Array.map(final.history, event => event.status)).toEqual([
        'saved',
        'interview',
        'rejected',
      ])
      expect(final.posting).toBe('Full requirements')
      expect(final.createdAt).toBe(first.createdAt)

      const foreign = yield* store
        .saveApplication('sraya', draft({ id: first.id, status: 'interview' }))
        .pipe(Effect.flip)
      expect(foreign._tag).toBe('NotFoundError')
      expect(foreign.message).toContain('not found')
      expect((yield* store.read('sraya')).applications).toEqual([])

      const prepared = yield* store.prepare('laxman', first.id)
      const posting = path.join(prepared.path, 'posting.md')
      expect(yield* fileSystem.readFileString(posting)).toContain(
        'Full requirements',
      )
      yield* fileSystem.writeFileString(posting, 'Edited posting')
      yield* store.prepare('laxman', first.id)
      expect(yield* fileSystem.readFileString(posting)).toBe('Edited posting')
      expect(
        yield* fileSystem.exists(path.join(prepared.path, 'brief.md')),
      ).toBe(true)
    }).pipe(provideStore),
  )

  it.effect('keeps omitted fields and clears fields set to empty text', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const created = (yield* store.saveApplication(
        'laxman',
        draft({
          source: 'https://example.com/jobs/9',
          location: 'Pune',
          notes: 'Referred',
          date: '2026-03-01',
        }),
      )).application
      const kept = (yield* store.saveApplication(
        'laxman',
        draft({ id: created.id, status: 'drafted' }),
      )).application
      expect(kept.source).toBe('https://example.com/jobs/9')
      expect(kept.location).toBe('Pune')
      expect(kept.notes).toBe('Referred')
      expect(kept.date).toBe('2026-03-01')
      const cleared = (yield* store.saveApplication(
        'laxman',
        draft({ id: created.id, status: 'drafted', location: '', source: '' }),
      )).application
      expect(cleared.location).toBe('')
      expect(cleared.source).toBe('')
      expect(cleared.history).toHaveLength(2)
    }).pipe(provideStore),
  )

  it.effect('does not add history when only notes change', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const created = (yield* store.saveApplication('laxman', draft({})))
        .application
      const edited = (yield* store.saveApplication(
        'laxman',
        draft({ id: created.id, notes: 'Just a note' }),
      )).application
      expect(edited.history).toHaveLength(1)
      expect(edited.notes).toBe('Just a note')
    }).pipe(provideStore),
  )

  it.effect('updates status with history and preserves other fields', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const created = (yield* store.saveApplication(
        'laxman',
        draft({ posting: 'Posting text', notes: 'First notes' }),
      )).application
      const same = (yield* store.updateStatus({
        person: 'laxman',
        id: created.id,
        status: 'saved',
      })).application
      expect(same.history).toHaveLength(1)
      const interview = yield* store.updateStatus({
        person: 'laxman',
        id: created.id,
        status: 'interview',
        notes: 'Technical round',
      })
      expect(
        Array.map(interview.application.history, event => event.status),
      ).toEqual(['saved', 'interview'])
      expect(interview.application.history[1]?.notes).toBe('Technical round')
      expect(interview.application.posting).toBe('Posting text')
      expect(interview.application.createdAt).toBe(created.createdAt)
      expect(interview.workspace.applications).toHaveLength(1)
      const kept = (yield* store.updateStatus({
        person: 'laxman',
        id: created.id,
        status: 'offer',
      })).application
      expect(kept.notes).toBe('Technical round')
    }).pipe(provideStore),
  )

  it.effect('reports unknown application ids', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const status = yield* store
        .updateStatus({ person: 'laxman', id: 'missing', status: 'applied' })
        .pipe(Effect.flip)
      expect(status._tag).toBe('NotFoundError')
      const prepare = yield* store
        .prepare('laxman', 'missing')
        .pipe(Effect.flip)
      expect(prepare._tag).toBe('NotFoundError')
    }).pipe(provideStore),
  )

  it.effect('does not drop applications under concurrent saves', () =>
    Effect.gen(function* () {
      const store = yield* Store
      yield* Effect.forEach(
        Array.makeBy(10, index => index),
        index =>
          store.saveApplication(
            'sraya',
            draft({ company: `Company ${index}` }),
          ),
        { concurrency: 'unbounded' },
      )
      expect((yield* store.read('sraya')).applications).toHaveLength(10)
    }).pipe(provideStore),
  )

  it.effect('returns the updated workspace view for one candidate only', () =>
    Effect.gen(function* () {
      const store = yield* Store
      const saved = yield* store.saveApplication('laxman', draft({}))
      expect(saved.workspace.person).toBe('laxman')
      expect(saved.workspace.profile.name).toBe('Laxman K R')
      const saved2 = yield* store.savePreferences('sraya', preferences)
      expect(saved2.person).toBe('sraya')
      expect(saved2.profile.name).toBe('Sraya Rajan')
      expect(saved2.applications).toEqual([])
      expect((yield* store.workspace('laxman')).applications).toHaveLength(1)
    }).pipe(provideStore),
  )
})
