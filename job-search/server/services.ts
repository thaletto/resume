import { Layer } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { FetchHttpClient } from 'effect/http'

import { BunServices } from '@effect/platform-bun'

import { JobSource } from './job-source.ts'
import { Store } from './store.ts'
import { WorkspaceConfig } from './workspace-config.ts'

export const PlatformLive = Layer.mergeAll(
  BunServices.layer,
  SecureRandom.layerWebCrypto,
  FetchHttpClient.layer,
)

export const ServicesLive = Layer.mergeAll(Store.layer, JobSource.layer).pipe(
  Layer.provideMerge(WorkspaceConfig.layer),
  Layer.provideMerge(PlatformLive),
)
