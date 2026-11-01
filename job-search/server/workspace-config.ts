import {
  Config,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Schema,
} from 'effect'

import { Person, Profile, StorageError } from '../domain/index.ts'

export const ProfileConfig = Schema.Struct({
  name: Schema.String,
  resume: Schema.String,
  pdf: Schema.String,
})
export type ProfileConfig = typeof ProfileConfig.Type

export const ProfileConfigs = Schema.Struct({
  laxman: ProfileConfig,
  sraya: ProfileConfig,
})
export type ProfileConfigs = typeof ProfileConfigs.Type

const ProfilesFile = Schema.fromJsonString(ProfileConfigs)

export class WorkspaceConfig extends Context.Service<
  WorkspaceConfig,
  {
    readonly root: string
    readonly directory: string
    readonly profiles: ProfileConfigs
    readonly workspacePath: (person: Person) => string
    readonly profile: (person: Person) => Profile
  }
>()('job-search/WorkspaceConfig') {
  static readonly layer: Layer.Layer<
    WorkspaceConfig,
    StorageError,
    FileSystem.FileSystem | Path.Path
  > = Layer.effect(
    WorkspaceConfig,
    Effect.gen(function* () {
      const maybeDirectory = yield* Config.NonEmptyString(
        'JOB_SEARCH_WORKSPACES',
      ).pipe(
        Config.option,
        Effect.mapError(error => new StorageError({ message: error.message })),
      )
      return yield* makeWorkspaceConfig(maybeDirectory)
    }),
  )

  static readonly layerAt = (
    directory: string,
  ): Layer.Layer<
    WorkspaceConfig,
    StorageError,
    FileSystem.FileSystem | Path.Path
  > =>
    Layer.effect(WorkspaceConfig, makeWorkspaceConfig(Option.some(directory)))
}

const makeWorkspaceConfig = (maybeDirectory: Option.Option<string>) =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const fileSystem = yield* FileSystem.FileSystem
    const root = path.resolve(import.meta.dirname, '../..')
    const directory = Option.match(maybeDirectory, {
      onNone: () => path.join(root, 'job-search', 'workspaces'),
      onSome: path.resolve,
    })
    const profilesPath = path.join(root, 'job-search', 'profiles.json')
    const profiles = yield* fileSystem.readFileString(profilesPath).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(ProfilesFile)),
      Effect.mapError(
        error =>
          new StorageError({
            message: `Cannot read job-search/profiles.json: ${error.message}`,
          }),
      ),
    )
    return WorkspaceConfig.of({
      root,
      directory,
      profiles,
      workspacePath: person => path.join(directory, person),
      profile: person => ({
        name: profiles[person].name,
        resume: profiles[person].resume,
      }),
    })
  })
