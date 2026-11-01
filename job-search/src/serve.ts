import { serve } from "./server.ts";
import { Effect } from "effect";

Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const server = yield* serve(undefined, Number(process.env.PORT ?? 8765));
  yield* Effect.log(`Job search: http://127.0.0.1:${server.port}`);
  yield* Effect.never;
})));
