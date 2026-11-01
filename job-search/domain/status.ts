import { Schema } from 'effect'

export const STATUSES = [
  'saved',
  'drafted',
  'applied',
  'interview',
  'offer',
  'hired',
  'rejected',
  'no_response',
  'offer_declined',
  'withdrawn',
] as const

export const Status = Schema.Literals(STATUSES).annotate({
  message: 'Choose a valid status',
})
export type Status = typeof Status.Type

const STATUS_LABELS: Record<Status, string> = {
  saved: 'Saved',
  drafted: 'Drafted',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  no_response: 'No response',
  offer_declined: 'Offer declined',
  withdrawn: 'Withdrawn',
}

export const statusLabel = (status: Status): string => STATUS_LABELS[status]
