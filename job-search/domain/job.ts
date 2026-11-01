import { Schema, SchemaTransformation } from 'effect'

import { TrimmedText } from './text.ts'

export const Job = Schema.Struct({
  company: Schema.String,
  role: Schema.String,
  source: Schema.String,
  location: Schema.String,
  posting: Schema.String,
})
export type Job = typeof Job.Type

export const WorkMode = Schema.Literals(['remote', 'hybrid', 'onsite'])
export type WorkMode = typeof WorkMode.Type

export const WorkModeFilter = Schema.Literals([
  '',
  'remote',
  'hybrid',
  'onsite',
]).annotate({ message: 'Choose a valid work mode' })
export type WorkModeFilter = typeof WorkModeFilter.Type

export const DiscoverQuery = Schema.Struct({
  query: TrimmedText('Search', 250).check(
    Schema.makeFilter(value => value.length > 0, {
      message: 'Enter a job title or skill to search',
    }),
  ),
  country: Schema.String.check(
    Schema.isPattern(/^([A-Za-z]{2})?$/, {
      message: 'Country must be a two-letter code, such as IN',
    }),
  ).pipe(
    Schema.decodeTo(
      Schema.String,
      SchemaTransformation.transform({
        decode: (country: string) => country.toUpperCase(),
        encode: (country: string) => country,
      }),
    ),
  ),
  workMode: WorkModeFilter,
})
export type DiscoverQuery = typeof DiscoverQuery.Type
