import { Schema, SchemaTransformation } from 'effect'

const DEFAULT_TEXT_LIMIT = 20000

export const TrimmedText = (label: string, limit = DEFAULT_TEXT_LIMIT) =>
  Schema.String.check(
    Schema.isMaxLength(limit, {
      message: `${label} must be at most ${limit} characters`,
    }),
  ).pipe(Schema.decodeTo(Schema.String, SchemaTransformation.trim()))

export const RequiredText = (label: string, limit = DEFAULT_TEXT_LIMIT) =>
  TrimmedText(label, limit).check(
    Schema.makeFilter(value => value.length > 0, {
      message: `${label} is required`,
    }),
  )

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isCalendarDate = (value: string): boolean => {
  if (value === '') {
    return true
  }
  if (!DATE_PATTERN.test(value)) {
    return false
  }
  const milliseconds = Date.parse(value)
  return (
    !Number.isNaN(milliseconds) &&
    new Date(milliseconds).toISOString().slice(0, 10) === value
  )
}

export const OptionalDate = (label: string) =>
  TrimmedText(label, 10).check(
    Schema.makeFilter(isCalendarDate, {
      message: `${label} must be a valid YYYY-MM-DD date`,
    }),
  )

const isHttpUrl = (value: string): boolean => {
  if (value === '') {
    return true
  }
  if (!URL.canParse(value)) {
    return false
  }
  const { protocol } = new URL(value)
  return protocol === 'http:' || protocol === 'https:'
}

export const OptionalHttpUrl = (label: string, limit: number) =>
  TrimmedText(label, limit)
    .check(
      Schema.makeFilter(isHttpUrl, {
        message: `${label} must be a valid http or https URL`,
      }),
    )
    .pipe(
      Schema.decodeTo(
        Schema.String,
        SchemaTransformation.transform({
          decode: (value: string) => (value === '' ? '' : new URL(value).href),
          encode: (value: string) => value,
        }),
      ),
    )
