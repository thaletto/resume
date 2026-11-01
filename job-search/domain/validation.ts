import { Array, Effect, Predicate, Schema, SchemaIssue } from 'effect'

import { type FieldIssue, ValidationError } from './errors.ts'

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

const pathKey = (segment: unknown): string =>
  Predicate.hasProperty(segment, 'key') ? String(segment.key) : String(segment)

export const fieldIssues = (
  issue: SchemaIssue.Issue,
): ReadonlyArray<FieldIssue> =>
  Array.map(formatIssues(issue).issues, found => ({
    field: Array.match(found.path ?? [], {
      onEmpty: () => '',
      onNonEmpty: ([first]) => pathKey(first),
    }),
    message: found.message,
  }))

export const validationMessage = (issue: SchemaIssue.Issue): string =>
  Array.join(
    Array.map(fieldIssues(issue), found => found.message),
    '; ',
  )

export const decodeInput = <S extends Schema.Decoder<unknown>>(schema: S) => {
  const decode = Schema.decodeUnknownEffect(schema)
  return (
    input: unknown,
  ): Effect.Effect<S['Type'], ValidationError, S['DecodingServices']> =>
    decode(input).pipe(
      Effect.mapError(
        error =>
          new ValidationError({
            message: validationMessage(error.issue),
            fields: fieldIssues(error.issue),
          }),
      ),
    )
}
