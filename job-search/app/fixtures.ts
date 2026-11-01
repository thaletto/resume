import {
  type Application,
  EMPTY_PREFERENCES,
  type Person,
  type Preferences,
  type Workspace,
} from '../domain/index.ts'

export const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'acme-engineer',
  company: 'Acme',
  role: 'Engineer',
  status: 'saved',
  date: '',
  deadline: '',
  source: 'https://example.com/jobs/1',
  notes: '',
  posting: '',
  location: 'Remote',
  history: [{ status: 'saved', date: '2026-02-01T00:00:00.000Z', notes: '' }],
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  ...overrides,
})

const profileName = (person: Person): string => {
  if (person === 'laxman') {
    return 'Laxman K R'
  }
  return 'Sraya Rajan'
}

export const makeWorkspace = (
  person: Person,
  applications: ReadonlyArray<Application> = [],
  preferences: Preferences = EMPTY_PREFERENCES,
): Workspace => ({
  person,
  profile: { name: profileName(person), resume: `resumes/${person}/cv.tex` },
  preferences,
  applications,
})
