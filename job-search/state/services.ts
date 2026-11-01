import { Layer } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { BunServices } from '@effect/platform-bun'

import { Store } from './store.ts'
import { WorkspaceConfig } from './workspace-config.ts'

export const PlatformLive = Layer.mergeAll(
  BunServices.layer,
  SecureRandom.layerWebCrypto,
)

export const ServicesLive = Store.layer.pipe(
  Layer.provideMerge(WorkspaceConfig.layer),
  Layer.provideMerge(PlatformLive),
)
