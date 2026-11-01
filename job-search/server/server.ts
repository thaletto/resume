import { Config, Effect, Layer } from 'effect'
import { HttpRouter } from 'effect/http'

import { BunHttpServer, BunRuntime } from '@effect/platform-bun'

import { AppRoutes } from './app.ts'
import { ServicesLive } from './services.ts'

export const DEFAULT_PORT = 8765
export const LOOPBACK_ADDRESS = '127.0.0.1'

export const serverLayer = (port: number) =>
  HttpRouter.serve(AppRoutes).pipe(
    Layer.provide(ServicesLive),
    Layer.provide(BunHttpServer.layer({ hostname: LOOPBACK_ADDRESS, port })),
  )

const configuredPort = Config.Port('PORT').pipe(
  Config.withDefault(DEFAULT_PORT),
)

export const main = Effect.gen(function* () {
  const port = yield* configuredPort
  return yield* Layer.launch(serverLayer(port))
})

if (import.meta.main) {
  BunRuntime.runMain(main)
}
