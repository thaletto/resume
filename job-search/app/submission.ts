import { Array, Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { FieldIssue } from '../domain/index.ts'

export const Submission = defineTaggedUnion({
  Idle: {},
  Submitting: {},
  SubmitFailed: {
    message: Schema.String,
    fieldErrors: Schema.Array(FieldIssue),
  },
})
export type Submission = typeof Submission.Type

export const isSubmitting = (submission: Submission): boolean =>
  Submission.match(submission, {
    Idle: () => false,
    Submitting: () => true,
    SubmitFailed: () => false,
  })

export const maybeFieldError = (
  submission: Submission,
  field: string,
): Option.Option<string> =>
  Submission.match(submission, {
    Idle: () => Option.none(),
    Submitting: () => Option.none(),
    SubmitFailed: ({ fieldErrors }) =>
      Option.map(
        Array.findFirst(fieldErrors, found => found.field === field),
        found => found.message,
      ),
  })

export const maybeFormError = (submission: Submission): Option.Option<string> =>
  Submission.match(submission, {
    Idle: () => Option.none(),
    Submitting: () => Option.none(),
    SubmitFailed: ({ message, fieldErrors }) =>
      Array.isReadonlyArrayEmpty(fieldErrors)
        ? Option.some(message)
        : Option.none(),
  })
