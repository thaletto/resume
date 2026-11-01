import { Effect } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationInput,
  Person,
  PreferencesInput,
  StatusUpdate,
  ValidationError,
  decodeInput,
  statusLabel,
} from './index.ts'

const decodeApplication = decodeInput(ApplicationInput)
const baseApplication = { company: 'Acme', role: 'Engineer', status: 'saved' }

const failureMessage = <A>(effect: Effect.Effect<A, ValidationError>) =>
  effect.pipe(
    Effect.flip,
    Effect.map(error => error.message),
  )

describe('ApplicationInput', () => {
  it.effect('trims text and normalises http URLs', () =>
    Effect.gen(function* () {
      const result = yield* decodeApplication({
        ...baseApplication,
        company: '  Acme  ',
        source: ' https://Example.com/jobs?id=1 ',
        date: '2026-02-28',
      })
      expect(result.company).toBe('Acme')
      expect(result.source).toBe('https://example.com/jobs?id=1')
      expect(result.date).toBe('2026-02-28')
    }),
  )

  it.effect('allows omitted and empty optional fields', () =>
    Effect.gen(function* () {
      const result = yield* decodeApplication({
        ...baseApplication,
        source: '',
        deadline: '',
      })
      expect(result.source).toBe('')
      expect(result.notes).toBeUndefined()
    }),
  )

  it.effect('rejects non-http URLs and unparseable URLs', () =>
    Effect.gen(function* () {
      const ftp = yield* failureMessage(
        decodeApplication({ ...baseApplication, source: 'ftp://example.com' }),
      )
      const junk = yield* failureMessage(
        decodeApplication({ ...baseApplication, source: 'not a url' }),
      )
      expect(ftp).toContain('http or https')
      expect(junk).toContain('http or https')
    }),
  )

  it.effect('rejects invalid calendar dates', () =>
    Effect.gen(function* () {
      const impossible = yield* failureMessage(
        decodeApplication({ ...baseApplication, date: '2026-02-30' }),
      )
      const wrongFormat = yield* failureMessage(
        decodeApplication({ ...baseApplication, deadline: '28/02/2026' }),
      )
      expect(impossible).toContain('Date must be a valid YYYY-MM-DD date')
      expect(wrongFormat).toContain('Deadline must be a valid YYYY-MM-DD date')
    }),
  )

  it.effect('requires company and role after trimming', () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(
        decodeApplication({ ...baseApplication, company: '   ' }),
      )
      expect(message).toContain('Company is required')
    }),
  )

  it.effect('enforces length limits on the raw value', () =>
    Effect.gen(function* () {
      const company = yield* failureMessage(
        decodeApplication({ ...baseApplication, company: 'a'.repeat(251) }),
      )
      const id = yield* failureMessage(
        decodeApplication({ ...baseApplication, id: 'a'.repeat(65) }),
      )
      expect(company).toContain('at most 250')
      expect(id).toContain('at most 64')
      const longNotes = yield* decodeApplication({
        ...baseApplication,
        notes: 'n'.repeat(20000),
      })
      expect(longNotes.notes?.length).toBe(20000)
    }),
  )

  it.effect('rejects unknown statuses', () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(
        decodeApplication({ ...baseApplication, status: 'ghosted' }),
      )
      expect(message).toContain('Choose a valid status')
    }),
  )
})

describe('PreferencesInput', () => {
  const decodePreferences = decodeInput(PreferencesInput)
  const base = {
    roles: [],
    location: '',
    constraints: '',
    languages: '',
    salary: '',
  }

  it.effect('trims roles and drops blanks', () =>
    Effect.gen(function* () {
      const result = yield* decodePreferences({
        ...base,
        roles: [' Staff Engineer ', '   ', 'Manager'],
        location: ' Remote ',
      })
      expect(result.roles).toEqual(['Staff Engineer', 'Manager'])
      expect(result.location).toBe('Remote')
    }),
  )

  it.effect('rejects more than 20 roles and long fields', () =>
    Effect.gen(function* () {
      const tooMany = yield* failureMessage(
        decodePreferences({ ...base, roles: Array(21).fill('Engineer') }),
      )
      const salary = yield* failureMessage(
        decodePreferences({ ...base, salary: 's'.repeat(1001) }),
      )
      expect(tooMany).toContain('up to 20 target roles')
      expect(salary).toContain('at most 1000')
    }),
  )
})

describe('Person and StatusUpdate', () => {
  it.effect('accepts only the two candidates', () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(decodeInput(Person)('someone'))
      expect(message).toContain('Choose Laxman or Sraya')
      expect(yield* decodeInput(Person)('sraya')).toBe('sraya')
    }),
  )

  it.effect('decodes a status update with optional notes', () =>
    Effect.gen(function* () {
      const result = yield* decodeInput(StatusUpdate)({
        person: 'laxman',
        id: ' abc ',
        status: 'applied',
      })
      expect(result.id).toBe('abc')
      expect(result.notes).toBeUndefined()
      expect(statusLabel(result.status)).toBe('Applied')
    }),
  )
})
