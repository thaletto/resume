import { Effect, Schema } from "effect";

export class AppError extends Schema.TaggedError<AppError>()("AppError", {
  message: Schema.String,
  code: Schema.String,
}) {}

export const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
export const attempt = <A>(operation: () => A, code = "validation") => Effect.try({ try: operation, catch: cause => new AppError({ message: errorMessage(cause), code }) });
export const io = <A>(operation: (signal: AbortSignal) => PromiseLike<A>, code = "storage") => Effect.tryPromise({ try: operation, catch: cause => new AppError({ message: errorMessage(cause), code }) });
