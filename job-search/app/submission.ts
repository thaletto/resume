import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Submission = defineTaggedUnion({
  Idle: {},
  Submitting: {},
  SubmitFailed: { message: Schema.String },
})
export type Submission = typeof Submission.Type

export const isSubmitting = (submission: Submission): boolean =>
  Submission.match(submission, {
    Idle: () => false,
    Submitting: () => true,
    SubmitFailed: () => false,
  })
