import { Schema } from 'effect'

export const FieldIssue = Schema.Struct({
  field: Schema.String,
  message: Schema.String,
})
export type FieldIssue = typeof FieldIssue.Type

export class ValidationError extends Schema.TaggedError<ValidationError>()(
  'ValidationError',
  {
    message: Schema.String,
    fields: Schema.optionalKey(Schema.Array(FieldIssue)),
  },
) {}

export class StorageError extends Schema.TaggedError<StorageError>()(
  'StorageError',
  { message: Schema.String },
) {}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  'NotFoundError',
  { message: Schema.String },
) {}

export class DuplicatePostingError extends Schema.TaggedError<DuplicatePostingError>()(
  'DuplicatePostingError',
  { message: Schema.String },
) {}

export class JobSourceError extends Schema.TaggedError<JobSourceError>()(
  'JobSourceError',
  { message: Schema.String },
) {}

export const JobSearchError = Schema.Union([
  ValidationError,
  StorageError,
  NotFoundError,
  DuplicatePostingError,
  JobSourceError,
])
export type JobSearchError = typeof JobSearchError.Type
