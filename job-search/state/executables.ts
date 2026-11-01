import { Effect, Option } from 'effect'

export const findExecutable = (
  name: string,
): Effect.Effect<Option.Option<string>> =>
  Effect.sync(() => Option.fromNullishOr(Bun.which(name)))
