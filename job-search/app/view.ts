import { Array, Option, String } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'

import { PEOPLE, type Person, type Workspace } from '../domain/index.ts'
import * as Applications from './applications/index.ts'
import * as Discover from './discover/index.ts'
import { Message } from './message.ts'
import {
  type Model,
  Notice,
  Section,
  Theme,
  WorkspaceState,
  candidateLabel,
} from './model.ts'
import * as Preferences from './preferences/index.ts'
import { type ButtonVariant, button } from './ui.ts'

type H = HtmlBuilder<Message>

const SECTIONS: ReadonlyArray<Section> = [
  Section.Applications(),
  Section.Discover(),
  Section.Preferences(),
]

const sectionLabel = (section: Section): string =>
  Section.match(section, {
    Applications: () => 'Applications',
    Discover: () => 'Discover jobs',
    Preferences: () => 'Preferences',
  })

const candidateName = (model: Model): string =>
  WorkspaceState.match(model.workspace, {
    Loading: () => candidateLabel(model.candidate),
    LoadFailed: () => candidateLabel(model.candidate),
    Ready: ({ workspace }) => workspace.profile.name,
  })

const candidateButton = (model: Model, candidate: Person, h: H): Html => {
  const variant: ButtonVariant =
    model.candidate === candidate ? 'primary' : 'ghost'
  return button(
    candidateLabel(candidate),
    Message.SelectedCandidate({ person: candidate }),
    h,
    variant,
  )
}

const sectionButton = (model: Model, section: Section, h: H): Html => {
  const variant: ButtonVariant =
    model.section._tag === section._tag ? 'nav-item selected' : 'nav-item'
  return button(
    sectionLabel(section),
    Message.SelectedSection({ section }),
    h,
    variant,
  )
}

const themeButtonLabel = (model: Model): string =>
  Theme.match(model.theme, {
    Light: () => 'Dark theme',
    Dark: () => 'Light theme',
  })

const sidebar = (model: Model, h: H): Html =>
  h.aside(
    [h.Class('sidebar')],
    [
      h.a(
        [h.Href('/'), h.Class('brand')],
        ['Job search', h.span([], ['Laxman & Sraya'])],
      ),
      h.div(
        [
          h.Class('candidate-picker'),
          h.Role('group'),
          h.AriaLabel('Candidate'),
        ],
        Array.map(PEOPLE, candidate => candidateButton(model, candidate, h)),
      ),
      h.nav(
        [h.AriaLabel('Workspace')],
        Array.map(SECTIONS, section => sectionButton(model, section, h)),
      ),
      h.div(
        [h.Class('sidebar-bottom')],
        [
          h.p([], ['Your search. Your evidence.']),
          h.small([], ['Personal workspaces stay local.']),
          button(themeButtonLabel(model), Message.ClickedToggleTheme(), h),
        ],
      ),
    ],
  )

const noticeView = (notice: Notice, h: H): Html =>
  Notice.match(notice, {
    Info: ({ message }) =>
      h.div([h.Class('notice'), h.Role('status')], [message]),
    Error: ({ message }) =>
      h.div([h.Class('notice error'), h.Role('alert')], [message]),
  })

const maybeNoticeView = (model: Model, h: H): Html =>
  Option.match(model.maybeNotice, {
    onNone: () => h.empty,
    onSome: notice => noticeView(notice, h),
  })

const sectionContent = (model: Model, workspace: Workspace, h: H): Html =>
  Section.match(model.section, {
    Applications: () =>
      h.submodel({
        slotId: 'applications',
        model: model.applications,
        view: Applications.view,
        viewInputs: { applications: workspace.applications },
        toParentMessage: message => Message.GotApplicationsMessage({ message }),
      }),
    Discover: () =>
      h.submodel({
        slotId: 'discover',
        model: model.discover,
        view: Discover.view,
        viewInputs: {
          savedSources: Array.filter(
            Array.map(
              workspace.applications,
              application => application.source,
            ),
            String.isNonEmpty,
          ),
        },
        toParentMessage: message => Message.GotDiscoverMessage({ message }),
      }),
    Preferences: () =>
      h.submodel({
        slotId: 'preferences',
        model: model.preferences,
        view: Preferences.view,
        toParentMessage: message => Message.GotPreferencesMessage({ message }),
      }),
  })

const workspaceContent = (model: Model, h: H): Html =>
  WorkspaceState.match(model.workspace, {
    Loading: () =>
      h.p([h.Role('status'), h.Class('muted')], ['Loading workspace…']),
    LoadFailed: ({ message }) =>
      h.div(
        [],
        [
          noticeView(Notice.Error({ message }), h),
          button(
            'Try again',
            Message.ClickedRetryLoadWorkspace(),
            h,
            'secondary',
          ),
        ],
      ),
    Ready: ({ workspace }) => sectionContent(model, workspace, h),
  })

export const view = (model: Model, h: H): Document => {
  const name = candidateName(model)
  const title = sectionLabel(model.section)
  return {
    title: `${title} · ${name}`,
    body: h.div(
      [h.Class('app-shell')],
      [
        sidebar(model, h),
        h.main(
          [h.Class('main-content')],
          [
            h.header(
              [h.Class('page-header')],
              [
                h.div([], [h.p([h.Class('muted')], [name]), h.h1([], [title])]),
                button(
                  'Add application',
                  Message.ClickedAddApplication(),
                  h,
                  'primary',
                ),
              ],
            ),
            maybeNoticeView(model, h),
            workspaceContent(model, h),
          ],
        ),
      ],
    ),
  }
}
