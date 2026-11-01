import { Array, Effect, Option, String } from 'effect'
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http'

export const MAX_BODY_BYTES = 150000

const LOOPBACK_HOSTNAMES = ['127.0.0.1', 'localhost']

export interface RequestFacts {
  readonly method: string
  readonly maybeHost: Option.Option<string>
  readonly maybeOrigin: Option.Option<string>
  readonly maybeContentType: Option.Option<string>
  readonly maybeContentLength: Option.Option<string>
}

export interface Refusal {
  readonly status: number
  readonly message: string
}

const isLoopbackHost = (host: string): boolean =>
  URL.canParse(`http://${host}`) &&
  new URL(`http://${host}`).host === String.toLowerCase(host) &&
  Array.contains(LOOPBACK_HOSTNAMES, new URL(`http://${host}`).hostname)

const isJsonContentType = (contentType: string): boolean =>
  String.startsWith('application/json')(String.toLowerCase(contentType))

const refuse = (status: number, message: string): Option.Option<Refusal> =>
  Option.some({ status, message })

const inspectBody = (
  facts: RequestFacts,
  host: string,
): Option.Option<Refusal> => {
  const sameOrigin = Option.contains(facts.maybeOrigin, `http://${host}`)
  if (!sameOrigin) {
    return refuse(403, 'Use the local dashboard')
  }
  const jsonBody = Option.exists(facts.maybeContentType, isJsonContentType)
  if (!jsonBody) {
    return refuse(403, 'Use the local dashboard')
  }
  return Option.match(facts.maybeContentLength, {
    onNone: () => refuse(411, 'Request length is required'),
    onSome: length => {
      const bytes = Number(length)
      return Number.isInteger(bytes) && bytes >= 0 && bytes <= MAX_BODY_BYTES
        ? Option.none()
        : refuse(413, 'Request is too large')
    },
  })
}

export const inspectRequest = (facts: RequestFacts): Option.Option<Refusal> =>
  Option.match(facts.maybeHost, {
    onNone: () => refuse(403, 'Use the printed loopback URL'),
    onSome: host => {
      if (!isLoopbackHost(host)) {
        return refuse(403, 'Use the printed loopback URL')
      }
      return facts.method === 'POST' ? inspectBody(facts, host) : Option.none()
    },
  })

const hostOf = (request: HttpServerRequest.HttpServerRequest) =>
  Option.fromUndefinedOr(request.headers.host).pipe(
    Option.orElse(() =>
      URL.canParse(request.originalUrl)
        ? Option.some(new URL(request.originalUrl).host)
        : Option.none(),
    ),
  )

const factsOf = (
  request: HttpServerRequest.HttpServerRequest,
): RequestFacts => ({
  method: request.method,
  maybeHost: hostOf(request),
  maybeOrigin: Option.fromUndefinedOr(request.headers.origin),
  maybeContentType: Option.fromUndefinedOr(request.headers['content-type']),
  maybeContentLength: Option.fromUndefinedOr(request.headers['content-length']),
})

export const withSecurityHeaders = (
  response: HttpServerResponse.HttpServerResponse,
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.setHeaders(response, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })

const refusalResponse = (refusal: Refusal) =>
  HttpServerResponse.jsonUnsafe(
    { error: refusal.message },
    { status: refusal.status },
  )

export const SecurityGuard = HttpRouter.middleware(
  httpEffect =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const response = yield* Option.match(inspectRequest(factsOf(request)), {
        onNone: () => httpEffect,
        onSome: refusal => Effect.succeed(refusalResponse(refusal)),
      })
      return withSecurityHeaders(response)
    }),
  { global: true },
)
