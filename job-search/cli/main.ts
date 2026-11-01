import { Console, Effect, FileSystem, Option, Schema } from 'effect'
import { Argument, Command, Flag } from 'effect/cli'

import { BunRuntime, BunServices } from '@effect/platform-bun'

import {
  ApplicationInput,
  JobSearchError,
  PEOPLE,
  type Person,
  PreferencesInput,
  STATUSES,
  StatusUpdate,
  ValidationError,
  decodeInput,
} from '../domain/index.ts'
import { findExecutable } from '../state/executables.ts'
import { ServicesLive } from '../state/services.ts'
import { Store } from '../state/store.ts'

const DOCTOR_TOOLS = [
  'bun',
  'opencode',
  'claude',
  'codex',
  'xelatex',
  'lualatex',
  'tectonic',
] as const

const printJson = (value: unknown) =>
  Console.log(JSON.stringify(value, null, 2))

const personArgument = Argument.Literals('person', PEOPLE)
const idArgument = Argument.String('id')

const optionalPersonArgument = Argument.Literals('person', [
  ...PEOPLE,
  'all',
]).pipe(Argument.optional)

const initializeSelected = (selected: Option.Option<Person | 'all'>) =>
  Effect.gen(function* () {
    const store = yield* Store
    const candidates = Option.match(selected, {
      onNone: () => PEOPLE,
      onSome: choice => (choice === 'all' ? PEOPLE : [choice]),
    })
    yield* Effect.forEach(candidates, candidate =>
      store
        .initialize(candidate)
        .pipe(Effect.flatMap(path => Console.log(`${candidate}: ${path}`))),
    )
  })

const initCommand = Command.make(
  'init',
  { selected: optionalPersonArgument },
  ({ selected }) => initializeSelected(selected),
).pipe(Command.withDescription('Create candidate workspaces'))

const listCommand = Command.make(
  'list',
  { person: personArgument },
  ({ person }) =>
    Effect.gen(function* () {
      const store = yield* Store
      yield* printJson(yield* store.read(person))
    }),
).pipe(Command.withDescription('Print a candidate state.json'))

const readJsonFile = (path: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const contents = yield* fileSystem.readFileString(path)
    return yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(Schema.Unknown),
    )(contents)
  }).pipe(
    Effect.mapError(
      error =>
        new ValidationError({
          message: `Cannot read ${path}: ${error.message}`,
        }),
    ),
  )

const saveCommand = Command.make(
  'save',
  {
    person: personArgument,
    file: Flag.String('file').pipe(
      Flag.withDescription('Application JSON file'),
    ),
  },
  ({ person, file }) =>
    Effect.gen(function* () {
      const store = yield* Store
      const input = yield* readJsonFile(file).pipe(
        Effect.flatMap(decodeInput(ApplicationInput)),
      )
      const saved = yield* store.saveApplication(person, input)
      yield* printJson(saved.application)
    }),
).pipe(Command.withDescription('Create or edit an application'))

const preferencesCommand = Command.make(
  'preferences',
  {
    person: personArgument,
    file: Flag.String('file').pipe(
      Flag.withDescription('Preferences JSON file'),
    ),
  },
  ({ person, file }) =>
    Effect.gen(function* () {
      const store = yield* Store
      const input = yield* readJsonFile(file).pipe(
        Effect.flatMap(decodeInput(PreferencesInput)),
      )
      const workspace = yield* store.savePreferences(person, input)
      yield* printJson(workspace.preferences)
    }),
).pipe(Command.withDescription('Replace confirmed candidate preferences'))

const statusCommand = Command.make(
  'status',
  {
    person: personArgument,
    id: idArgument,
    status: Flag.Literals('status', STATUSES).pipe(
      Flag.withDescription('New application status'),
    ),
    notes: Flag.String('notes').pipe(
      Flag.withDescription('Notes for this status change'),
      Flag.optional,
    ),
  },
  ({ person, id, status, notes }) =>
    Effect.gen(function* () {
      const store = yield* Store
      const update = yield* decodeInput(StatusUpdate)(
        Option.match(notes, {
          onNone: () => ({ person, id, status }),
          onSome: value => ({ person, id, status, notes: value }),
        }),
      )
      const saved = yield* store.updateStatus(update)
      yield* printJson(saved.application)
    }),
).pipe(Command.withDescription('Change an application status'))

const prepareCommand = Command.make(
  'prepare',
  { person: personArgument, id: idArgument },
  ({ person, id }) =>
    Effect.gen(function* () {
      const store = yield* Store
      const prepared = yield* store.prepare(person, id)
      yield* Console.log(prepared.path)
    }),
).pipe(Command.withDescription('Create posting and brief files'))

const doctorCommand = Command.make('doctor', {}, () =>
  Effect.forEach(DOCTOR_TOOLS, tool =>
    findExecutable(tool).pipe(
      Effect.flatMap(maybePath =>
        Console.log(
          `${tool}: ${Option.getOrElse(maybePath, () => 'not installed')}`,
        ),
      ),
    ),
  ),
).pipe(Command.withDescription('Show detected tools'))

export const root = Command.make('job-search').pipe(
  Command.withDescription('Candidate job search workspace'),
  Command.withSubcommands([
    initCommand,
    listCommand,
    saveCommand,
    preferencesCommand,
    statusCommand,
    prepareCommand,
    doctorCommand,
  ]),
)

const reportJobSearchError = (error: unknown) =>
  Schema.is(JobSearchError)(error) ? Console.error(error.message) : Effect.void

export const program = Command.run(root, { version: '1.0.0' }).pipe(
  Effect.tapError(reportJobSearchError),
  Effect.provide(ServicesLive),
  Effect.provide(BunServices.layer),
)

if (import.meta.main) {
  BunRuntime.runMain(program, { disableErrorReporting: true })
}
