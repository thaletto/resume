import { Effect, Schema, SchemaIssue } from 'effect'

import { ValidationError } from './errors.ts'

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

export const validationMessage = (issue: SchemaIssue.Issue): string =>
  formatIssues(issue)
    .issues.map(found => found.message)
    .join('; ')

export const decodeInput = <S extends Schema.Decoder<unknown>>(schema: S) => {
  const decode = Schema.decodeUnknownEffect(schema)
  return (
    input: unknown,
  ): Effect.Effect<S['Type'], ValidationError, S['DecodingServices']> =>
    decode(input).pipe(
      Effect.mapError(
        error =>
          new ValidationError({ message: validationMessage(error.issue) }),
      ),
    )
}
