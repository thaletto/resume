import { Effect, FileSystem, Layer } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { BunServices } from '@effect/platform-bun'

import { Store } from './store.ts'
import { WorkspaceConfig } from './workspace-config.ts'

const TestPlatform = Layer.mergeAll(
  BunServices.layer,
  SecureRandom.layerWebCrypto,
)

const TestWorkspaces = Layer.unwrap(
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: 'resume-test-',
    })
    return WorkspaceConfig.layerAt(directory)
  }),
)

export const TestStore = Store.layer.pipe(
  Layer.provideMerge(TestWorkspaces),
  Layer.provideMerge(TestPlatform),
)
