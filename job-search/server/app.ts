import { Array, Effect, Layer, Path } from 'effect'
import { HttpRouter, HttpServerResponse, HttpStaticServer } from 'effect/http'
import { RpcSerialization, RpcServer } from 'effect/rpc'

import { JobSearchRpcs } from '../domain/index.ts'
import { SecurityGuard } from './guard.ts'
import { JobSearchHandlers } from './handlers.ts'
import { initializeAll } from './store.ts'
import { WorkspaceConfig } from './workspace-config.ts'

export const RPC_PATH = '/rpc'

const UNROUTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const

const RpcRoute = RpcServer.layerHttp({
  group: JobSearchRpcs,
  path: RPC_PATH,
  protocol: 'http',
}).pipe(
  Layer.provide(JobSearchHandlers),
  Layer.provide(RpcSerialization.layerJson),
)

const NotFoundRoutes = Layer.mergeAll(
  ...Array.map(UNROUTED_METHODS, method =>
    HttpRouter.add(
      method,
      '*',
      Effect.succeed(HttpServerResponse.text('Not found', { status: 404 })),
    ),
  ),
)

const StaticRoute = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* WorkspaceConfig
    const path = yield* Path.Path
    return HttpStaticServer.layer({
      root: path.join(config.root, 'dist', 'app'),
    })
  }),
)

export const InitializeWorkspaces = Layer.effectDiscard(initializeAll)

export const ApiRoutes = Layer.mergeAll(
  RpcRoute,
  SecurityGuard,
  NotFoundRoutes,
  InitializeWorkspaces,
)

export const AppRoutes = Layer.mergeAll(ApiRoutes, StaticRoute)
