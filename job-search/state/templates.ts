import { Application, Person } from '../domain/index.ts'

export const LEGACY_CLI_COMMAND = 'bun ../../src/cli.ts'
export const CLI_COMMAND = 'bun ../../cli/main.ts'

export const agentInstructions = (person: Person, name: string): string =>
  [
    `# Job search: ${name}`,
    '',
    `This workspace belongs only to ${person}.`,
    'Read master.tex for verified resume evidence. Read ../../../job-search/WORKFLOWS.md for the workflow.',
    'Keep all drafts and research under applications/<application-id>/.',
    'Use the repository CLI to update state.json; do not overwrite it directly.',
    `From this directory: ${CLI_COMMAND} list ${person}`,
    'All preferences in state.json are candidate-provided; blank fields are unknown.',
    'Never combine sibling candidate evidence, fabricate experience, or mark an application submitted without confirmation.',
    '',
  ].join('\n')

export const migrateInstructions = (contents: string): string =>
  contents.replaceAll(LEGACY_CLI_COMMAND, CLI_COMMAND)

export const postingDocument = (application: Application): string =>
  [
    `# ${application.company}: ${application.role}`,
    '',
    `Source: ${application.source === '' ? 'Not provided' : application.source}`,
    '',
    application.posting === ''
      ? 'Paste the complete job description here before evaluating fit.'
      : application.posting,
    '',
  ].join('\n')

export const briefDocument = (name: string, application: Application): string =>
  [
    '# Application brief',
    '',
    `Candidate: ${name}`,
    `Role: ${application.role}`,
    `Company: ${application.company}`,
    '',
    'Use ../../master.tex as evidence and ../../state.json for confirmed preferences.',
    'Follow ../../../../../job-search/WORKFLOWS.md.',
    'Write evaluation.md first, then cv.tex, cover-letter.tex, review.md and interview.md as needed.',
    '',
  ].join('\n')
