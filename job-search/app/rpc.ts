import { Effect, Layer, Schema } from 'effect'
import { RpcClient, RpcSerialization } from 'effect/rpc'
import { Http } from 'foldkit'

import {
  ApplicationInput,
  JobSearchError,
  JobSearchRpcs,
  type Person,
  decodeInput,
} from '../domain/index.ts'

const RPC_PATH = '/rpc'
const REQUEST_TIMEOUT = '30 seconds'

export const REQUEST_FAILED_MESSAGE =
  'Could not complete the request. Try again.'

const ClientProtocol = RpcClient.layerProtocolHttp({ url: RPC_PATH }).pipe(
  Layer.provide(Layer.mergeAll(RpcSerialization.layerJson, Http.layer)),
)

export const makeClient = RpcClient.make(JobSearchRpcs)

export const provideServer = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.scoped,
    Effect.provide(ClientProtocol),
  )

const isJobSearchError = Schema.is(JobSearchError)

export const failureMessage = (error: unknown): string => {
  if (isJobSearchError(error)) {
    return error.message
  }
  return REQUEST_FAILED_MESSAGE
}

const decodeApplicationInput = decodeInput(ApplicationInput)

export const saveApplication = (person: Person, input: unknown) =>
  provideServer(
    Effect.gen(function* () {
      const application = yield* decodeApplicationInput(input)
      const client = yield* makeClient
      return yield* client.SaveApplication({ person, application })
    }),
  )
