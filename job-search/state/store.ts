import {
  Clock,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  PlatformError,
  Schema,
  Semaphore,
} from 'effect'
import { SecureRandom } from 'effect/crypto'

import {
  type Application,
  type ApplicationInput,
  DuplicatePostingError,
  EMPTY_STATE,
  NotFoundError,
  PEOPLE,
  type Person,
  type PreferencesInput,
  type PreparedApplication,
  type SavedApplication,
  State,
  type StatusUpdate,
  StorageError,
  type Workspace,
} from '../domain/index.ts'
import {
  changeStatus,
  createApplication,
  editApplication,
  findApplication,
  isDuplicateSource,
  upsertApplication,
} from './rules.ts'
import {
  agentInstructions,
  briefDocument,
  migrateInstructions,
  postingDocument,
} from './templates.ts'
import { WorkspaceConfig } from './workspace-config.ts'

const decodeState = Schema.decodeUnknownEffect(Schema.fromJsonString(State))

const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'] as const

const storageError = (error: PlatformError.PlatformError): StorageError =>
  new StorageError({ message: error.message })

const applicationNotFound = () =>
  new NotFoundError({
    message: "Application not found in this candidate's workspace",
  })

const now = Effect.map(Clock.currentTimeMillis, milliseconds =>
  new Date(milliseconds).toISOString(),
)

export class Store extends Context.Service<
  Store,
  {
    readonly initialize: (person: Person) => Effect.Effect<string, StorageError>
    readonly read: (person: Person) => Effect.Effect<State, StorageError>
    readonly workspace: (
      person: Person,
    ) => Effect.Effect<Workspace, StorageError>
    readonly saveApplication: (
      person: Person,
      input: ApplicationInput,
    ) => Effect.Effect<
      SavedApplication,
      NotFoundError | DuplicatePostingError | StorageError
    >
    readonly updateStatus: (
      update: StatusUpdate,
    ) => Effect.Effect<SavedApplication, NotFoundError | StorageError>
    readonly savePreferences: (
      person: Person,
      input: PreferencesInput,
    ) => Effect.Effect<Workspace, StorageError>
    readonly prepare: (
      person: Person,
      id: string,
    ) => Effect.Effect<PreparedApplication, NotFoundError | StorageError>
  }
>()('job-search/Store') {
  static readonly layer: Layer.Layer<
    Store,
    never,
    | WorkspaceConfig
    | FileSystem.FileSystem
    | Path.Path
    | SecureRandom.SecureRandom
  > = Layer.effect(
    Store,
    Effect.suspend(() => makeStore),
  )
}

const makeStore = Effect.gen(function* () {
  const config = yield* WorkspaceConfig
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const secureRandom = yield* SecureRandom.SecureRandom
  const locks = yield* Effect.all({
    laxman: Semaphore.make(1),
    sraya: Semaphore.make(1),
  })

  const exists = (target: string) =>
    fileSystem.exists(target).pipe(Effect.mapError(storageError))

  const writeFile = (target: string, contents: string) =>
    fileSystem
      .writeFileString(target, contents)
      .pipe(Effect.mapError(storageError))

  const readOptional = (target: string) =>
    exists(target).pipe(
      Effect.flatMap(found =>
        found
          ? fileSystem
              .readFileString(target)
              .pipe(Effect.map(Option.some), Effect.mapError(storageError))
          : Effect.succeed(Option.none<string>()),
      ),
    )

  const writeIfAbsent = (target: string, contents: string) =>
    exists(target).pipe(
      Effect.flatMap(found =>
        found ? Effect.void : writeFile(target, contents),
      ),
    )

  const toWorkspace = (person: Person, state: State): Workspace => ({
    person,
    profile: config.profile(person),
    preferences: state.preferences,
    applications: state.applications,
  })

  const read = Effect.fn('Store.read')(function* (person: Person) {
    const maybeContents = yield* readOptional(
      path.join(config.workspacePath(person), 'state.json'),
    )
    return yield* Option.match(maybeContents, {
      onNone: () => Effect.succeed(EMPTY_STATE),
      onSome: contents =>
        decodeState(contents).pipe(
          Effect.mapError(
            error =>
              new StorageError({
                message: `Invalid workspace data: ${error.message}`,
              }),
          ),
        ),
    })
  })

  const save = Effect.fn('Store.save')(function* (
    person: Person,
    state: State,
  ) {
    const directory = config.workspacePath(person)
    const id = yield* secureRandom.uuidV4()
    const temporary = path.join(directory, `${id}.tmp`)
    yield* fileSystem
      .makeDirectory(directory, { recursive: true })
      .pipe(Effect.mapError(storageError))
    yield* fileSystem
      .writeFileString(temporary, `${JSON.stringify(state, null, 2)}\n`)
      .pipe(
        Effect.andThen(
          fileSystem.rename(temporary, path.join(directory, 'state.json')),
        ),
        Effect.onError(() =>
          fileSystem.remove(temporary, { force: true }).pipe(Effect.ignore),
        ),
        Effect.mapError(storageError),
      )
  })

  const workspace = Effect.fn('Store.workspace')(function* (person: Person) {
    return toWorkspace(person, yield* read(person))
  })

  const prepareInstructionFile = (
    person: Person,
    directory: string,
    file: (typeof INSTRUCTION_FILES)[number],
  ) =>
    Effect.gen(function* () {
      const target = path.join(directory, file)
      const maybeContents = yield* readOptional(target)
      yield* Option.match(maybeContents, {
        onNone: () =>
          writeFile(
            target,
            agentInstructions(person, config.profile(person).name),
          ),
        onSome: contents => {
          const migrated = migrateInstructions(contents)
          return migrated === contents
            ? Effect.void
            : writeFile(target, migrated)
        },
      })
    })

  const initialize = Effect.fn('Store.initialize')(function* (person: Person) {
    return yield* locks[person].withPermit(
      Effect.gen(function* () {
        const directory = config.workspacePath(person)
        yield* fileSystem
          .makeDirectory(path.join(directory, 'applications'), {
            recursive: true,
          })
          .pipe(Effect.mapError(storageError))
        const master = path.join(directory, 'master.tex')
        const masterExists = yield* exists(master)
        if (!masterExists) {
          yield* fileSystem
            .copyFile(
              path.join(config.root, config.profiles[person].resume),
              master,
            )
            .pipe(Effect.mapError(storageError))
        }
        yield* Effect.forEach(INSTRUCTION_FILES, file =>
          prepareInstructionFile(person, directory, file),
        )
        const stateExists = yield* exists(path.join(directory, 'state.json'))
        if (stateExists) {
          yield* read(person)
        } else {
          yield* save(person, EMPTY_STATE)
        }
        return directory
      }),
    )
  })

  const findExisting = (
    state: State,
    maybeId: Option.Option<string>,
  ): Effect.Effect<Option.Option<Application>, NotFoundError> =>
    Option.match(maybeId, {
      onNone: () => Effect.succeed(Option.none<Application>()),
      onSome: id =>
        Option.match(findApplication(state.applications, id), {
          onNone: () => Effect.fail(applicationNotFound()),
          onSome: existing => Effect.succeed(Option.some(existing)),
        }),
    })

  const saveApplication = Effect.fn('Store.saveApplication')(function* (
    person: Person,
    input: ApplicationInput,
  ) {
    return yield* locks[person].withPermit(
      Effect.gen(function* () {
        const state = yield* read(person)
        const timestamp = yield* now
        const newId = yield* secureRandom.uuidV4()
        const maybeExisting = yield* findExisting(
          state,
          Option.fromUndefinedOr(input.id),
        )
        const application = Option.match(maybeExisting, {
          onNone: () => createApplication(input, newId, timestamp),
          onSome: existing => editApplication(existing, input, timestamp),
        })
        if (isDuplicateSource(state.applications, application)) {
          return yield* new DuplicatePostingError({
            message:
              'This posting is already saved; edit the existing application',
          })
        }
        const next: State = {
          version: state.version,
          preferences: state.preferences,
          applications: upsertApplication(state.applications, application),
        }
        yield* save(person, next)
        return { application, workspace: toWorkspace(person, next) }
      }),
    )
  })

  const updateStatus = Effect.fn('Store.updateStatus')(function* (
    update: StatusUpdate,
  ) {
    return yield* locks[update.person].withPermit(
      Effect.gen(function* () {
        const state = yield* read(update.person)
        const timestamp = yield* now
        const existing = yield* Option.match(
          findApplication(state.applications, update.id),
          {
            onNone: () => Effect.fail(applicationNotFound()),
            onSome: Effect.succeed,
          },
        )
        const application = changeStatus(existing, update, timestamp)
        const next: State = {
          version: state.version,
          preferences: state.preferences,
          applications: upsertApplication(state.applications, application),
        }
        yield* save(update.person, next)
        return { application, workspace: toWorkspace(update.person, next) }
      }),
    )
  })

  const savePreferences = Effect.fn('Store.savePreferences')(function* (
    person: Person,
    input: PreferencesInput,
  ) {
    return yield* locks[person].withPermit(
      Effect.gen(function* () {
        const state = yield* read(person)
        const next: State = {
          version: state.version,
          preferences: input,
          applications: state.applications,
        }
        yield* save(person, next)
        return toWorkspace(person, next)
      }),
    )
  })

  const prepare = Effect.fn('Store.prepare')(function* (
    person: Person,
    id: string,
  ) {
    const state = yield* read(person)
    const application = yield* Option.match(
      findApplication(state.applications, id),
      {
        onNone: () =>
          Effect.fail(new NotFoundError({ message: 'Application not found' })),
        onSome: Effect.succeed,
      },
    )
    const directory = path.join(
      config.workspacePath(person),
      'applications',
      application.id,
    )
    yield* fileSystem
      .makeDirectory(directory, { recursive: true })
      .pipe(Effect.mapError(storageError))
    yield* writeIfAbsent(
      path.join(directory, 'posting.md'),
      postingDocument(application),
    )
    yield* writeIfAbsent(
      path.join(directory, 'brief.md'),
      briefDocument(config.profile(person).name, application),
    )
    return { path: directory, workspace: toWorkspace(person, state) }
  })

  return Store.of({
    initialize,
    read,
    workspace,
    saveApplication,
    updateStatus,
    savePreferences,
    prepare,
  })
})

export const initializeAll = Effect.gen(function* () {
  const store = yield* Store
  return yield* Effect.forEach(PEOPLE, person => store.initialize(person))
})
