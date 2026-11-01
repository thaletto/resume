import { Effect, FileSystem, Layer, Path } from 'effect'
import { SecureRandom } from 'effect/crypto'
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpPlatform,
  HttpRouter,
} from 'effect/http'
import { RpcClient, RpcSerialization } from 'effect/rpc'

import { BunHttpServer, BunServices } from '@effect/platform-bun'

import { JobSearchRpcs } from '../domain/index.ts'
import { AppRoutes } from './app.ts'
import { JobSource } from './job-source.ts'
import { Store } from './store.ts'
import { WorkspaceConfig } from './workspace-config.ts'

export const TEST_ORIGIN = 'http://127.0.0.1:8765'

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

export interface FakeResponse {
  readonly status: number
  readonly body: unknown
}

export const makeFakeHttpClient = (
  respond: (request: HttpClientRequest.HttpClientRequest) => FakeResponse,
) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const client = HttpClient.make(request =>
    Effect.sync(() => {
      requests.push(request)
      const { status, body } = respond(request)
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      )
    }),
  )
  return { requests, layer: Layer.succeed(HttpClient.HttpClient)(client) }
}

export const makeTestServices = (
  respond: (request: HttpClientRequest.HttpClientRequest) => FakeResponse,
) => {
  const fake = makeFakeHttpClient(respond)
  const jobSource = JobSource.layer.pipe(Layer.provide(fake.layer))
  return {
    requests: fake.requests,
    layer: Layer.mergeAll(TestStore, jobSource).pipe(
      Layer.provideMerge(BunHttpServer.layerHttpServices),
    ),
  }
}

const sizedRequest = (webRequest: Request) =>
  Effect.promise(async () => {
    const bytes = await webRequest.clone().arrayBuffer()
    const headers = new Headers(webRequest.headers)
    headers.set('content-length', String(bytes.byteLength))
    return new Request(webRequest, { headers })
  })

export type AppServices =
  | Store
  | JobSource
  | WorkspaceConfig
  | FileSystem.FileSystem
  | Path.Path
  | HttpPlatform.HttpPlatform

export const makeApp = Effect.fn('makeApp')(function* <E>(
  services: Layer.Layer<AppServices, E>,
) {
  const context = yield* Layer.build(services)
  const app = HttpRouter.toWebHandler(
    AppRoutes.pipe(Layer.provide(Layer.succeedContext(context))),
    { disableLogger: true },
  )
  yield* Effect.addFinalizer(() => Effect.promise(app.dispose))
  const send = (request: Request) => Effect.promise(() => app.handler(request))
  const httpClient = HttpClient.make(request =>
    HttpClientRequest.toWeb(request).pipe(
      Effect.flatMap(sizedRequest),
      Effect.flatMap(send),
      Effect.map(response => HttpClientResponse.fromWeb(request, response)),
      Effect.orDie,
    ),
  )
  return { context, send, httpClient }
})

export const rpcClientLayer = (httpClient: HttpClient.HttpClient) =>
  RpcClient.layerProtocolHttp({
    url: `${TEST_ORIGIN}/rpc`,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader('origin', TEST_ORIGIN),
    ),
  }).pipe(
    Layer.provide(RpcSerialization.layerJson),
    Layer.provide(Layer.succeed(HttpClient.HttpClient)(httpClient)),
  )

export const makeRpcClient = (httpClient: HttpClient.HttpClient) =>
  RpcClient.make(JobSearchRpcs).pipe(Effect.provide(rpcClientLayer(httpClient)))
