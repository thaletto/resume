import { Array, Option, Result } from 'effect'
import { register, render } from 'pele/core'
import flowchart from 'pele/diagrams/flowchart'

import type { Person } from '../../domain/index.ts'

register(flowchart)

export type AgentStep = Readonly<{
  command: string
  isManual: boolean
}>

export const agentSteps = (person: Person): ReadonlyArray<AgentStep> => [
  { command: `/job-search ${person}`, isManual: false },
  { command: '/find-jobs "backend, IN, remote"', isManual: false },
  { command: '/evaluate <app-id>', isManual: false },
  { command: '/tailor <app-id>', isManual: false },
  { command: '/cover-letter <app-id>', isManual: false },
  { command: 'Submit it yourself', isManual: true },
  { command: '/status <app-id> applied', isManual: false },
  { command: '/interview <app-id>', isManual: false },
]

const escapeLabel = (text: string): string =>
  text.replaceAll('"', '#quot;').replaceAll('<', '#lt;').replaceAll('>', '#gt;')

const stepNode = (step: AgentStep, index: number): string => {
  const label = `"${escapeLabel(step.command)}"`
  return step.isManual ? `  S${index}([${label}])` : `  S${index}[${label}]`
}

export const agentFlowSource = (person: Person): string => {
  const steps = agentSteps(person)
  return Array.join(
    [
      'flowchart LR',
      ...Array.map(steps, stepNode),
      ...Array.map(
        Array.range(1, steps.length - 1),
        index => `  S${index - 1} --> S${index}`,
      ),
    ],
    '\n',
  )
}

const renderedFlows = new Map<Person, Option.Option<string>>()

export const agentFlowSvg = (person: Person): Option.Option<string> => {
  const cached = renderedFlows.get(person)
  if (cached !== undefined) {
    return cached
  }
  const svg = Result.getSuccess(
    Result.try(
      () =>
        render(agentFlowSource(person), {
          fontFamily: 'JetBrains Mono Variable, monospace',
          fontSize: 12,
          idPrefix: `agent-flow-${person}`,
          responsive: false,
          autoDirection: false,
          links: false,
          images: false,
        }).svg,
    ),
  )
  renderedFlows.set(person, svg)
  return svg
}
