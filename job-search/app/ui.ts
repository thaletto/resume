import { Array, Option } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'nav-item'
  | 'nav-item selected'

export type Choice = Readonly<{ value: string; label: string }>

export const button = <Message>(
  label: string,
  onClick: Message,
  h: HtmlBuilder<Message>,
  variant: ButtonVariant = 'secondary',
  isDisabled = false,
  extraAttributes: ReadonlyArray<Attribute<Message>> = [],
): Html =>
  Button.view(
    {
      onClick,
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(`button ${variant}`),
            ...extraAttributes,
          ],
          [label],
        ),
    },
    h,
  )

const errorId = (id: string): string => `${id}-error`

const fieldError = <Message>(
  id: string,
  maybeError: Option.Option<string>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  Option.match(maybeError, {
    onNone: () => [],
    onSome: message => [
      h.p([h.Id(errorId(id)), h.Class('field-error')], [message]),
    ],
  })

const invalidAttributes = <Message>(
  id: string,
  maybeError: Option.Option<string>,
  h: HtmlBuilder<Message>,
) =>
  Option.isSome(maybeError)
    ? [h.AriaInvalid(true), h.AriaDescribedBy(errorId(id))]
    : []

export const submitButton = <Message>(
  label: string,
  isWorking: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      type: 'submit',
      isDisabled: isWorking,
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class('button primary')],
          [isWorking ? 'Working…' : label],
        ),
    },
    h,
  )

export const textInput = <Message>(
  label: string,
  id: string,
  value: string,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
  type = 'text',
  maybeError: Option.Option<string> = Option.none(),
): Html =>
  Input.view(
    {
      id,
      value,
      type,
      onInput,
      toView: attributes =>
        h.div(
          [h.Class('field')],
          [
            h.label([...attributes.label], [label]),
            h.input([
              ...attributes.input,
              h.Class('input'),
              ...invalidAttributes(id, maybeError, h),
            ]),
            ...fieldError(id, maybeError, h),
          ],
        ),
    },
    h,
  )

export const textArea = <Message>(
  label: string,
  id: string,
  value: string,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
  maybeError: Option.Option<string> = Option.none(),
): Html =>
  h.div(
    [h.Class('field')],
    [
      h.label([h.For(id)], [label]),
      h.textarea([
        h.Id(id),
        h.Value(value),
        h.OnInput(onInput),
        h.Class('input textarea'),
        ...invalidAttributes(id, maybeError, h),
      ]),
      ...fieldError(id, maybeError, h),
    ],
  )

export const select = <Message>(
  label: string,
  id: string,
  value: string,
  choices: ReadonlyArray<Choice>,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
  maybeError: Option.Option<string> = Option.none(),
): Html =>
  h.div(
    [h.Class('field')],
    [
      h.label([h.For(id)], [label]),
      h.select(
        [
          h.Id(id),
          h.Value(value),
          h.OnInput(onInput),
          h.Class('input'),
          ...invalidAttributes(id, maybeError, h),
        ],
        Array.map(choices, choice =>
          h.option([h.Value(choice.value)], [choice.label]),
        ),
      ),
      ...fieldError(id, maybeError, h),
    ],
  )

export const formError = <Message>(
  maybeError: Option.Option<string>,
  h: HtmlBuilder<Message>,
  id: string,
): Html =>
  Option.match(maybeError, {
    onNone: () => h.empty,
    onSome: message =>
      h.p([h.Id(id), h.Class('form-error'), h.Role('alert')], [message]),
  })
