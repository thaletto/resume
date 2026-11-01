import { Array, Option } from 'effect'

import type {
  Application,
  ApplicationInput,
  StatusUpdate,
} from '../domain/index.ts'

export const createApplication = (
  input: ApplicationInput,
  id: string,
  now: string,
): Application => {
  const notes = input.notes ?? ''
  return {
    id,
    company: input.company,
    role: input.role,
    status: input.status,
    date: input.date ?? '',
    deadline: input.deadline ?? '',
    source: input.source ?? '',
    notes,
    posting: input.posting ?? '',
    location: input.location ?? '',
    history: [{ status: input.status, date: now, notes }],
    createdAt: now,
    updatedAt: now,
  }
}

const historyAfter = (
  existing: Application,
  status: Application['status'],
  notes: string,
  now: string,
): Application['history'] =>
  existing.status === status
    ? existing.history
    : Array.append(existing.history, { status, date: now, notes })

export const editApplication = (
  existing: Application,
  input: ApplicationInput,
  now: string,
): Application => {
  const notes = input.notes ?? existing.notes
  return {
    id: existing.id,
    company: input.company,
    role: input.role,
    status: input.status,
    date: input.date ?? existing.date,
    deadline: input.deadline ?? existing.deadline,
    source: input.source ?? existing.source,
    notes,
    posting: input.posting ?? existing.posting,
    location: input.location ?? existing.location,
    history: historyAfter(existing, input.status, notes, now),
    createdAt: existing.createdAt,
    updatedAt: now,
  }
}

export const changeStatus = (
  existing: Application,
  update: StatusUpdate,
  now: string,
): Application => {
  const notes = update.notes ?? existing.notes
  return {
    id: existing.id,
    company: existing.company,
    role: existing.role,
    status: update.status,
    date: existing.date,
    deadline: existing.deadline,
    source: existing.source,
    notes,
    posting: existing.posting,
    location: existing.location,
    history: historyAfter(existing, update.status, notes, now),
    createdAt: existing.createdAt,
    updatedAt: now,
  }
}

export const findApplication = (
  applications: ReadonlyArray<Application>,
  id: string,
): Option.Option<Application> =>
  Array.findFirst(applications, application => application.id === id)

export const isDuplicateSource = (
  applications: ReadonlyArray<Application>,
  candidate: Application,
): boolean =>
  candidate.source !== '' &&
  Array.some(
    applications,
    application =>
      application.id !== candidate.id &&
      application.source === candidate.source,
  )

export const upsertApplication = (
  applications: ReadonlyArray<Application>,
  candidate: Application,
): ReadonlyArray<Application> =>
  Array.match(
    Array.filter(applications, application => application.id === candidate.id),
    {
      onEmpty: () => Array.append(applications, candidate),
      onNonEmpty: () =>
        Array.map(applications, application =>
          application.id === candidate.id ? candidate : application,
        ),
    },
  )
