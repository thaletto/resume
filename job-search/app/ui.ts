import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

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
): Html =>
  Button.view(
    {
      onClick,
      isDisabled,
      toView: attributes =>
        h.button([...attributes.button, h.Class(`button ${variant}`)], [label]),
    },
    h,
  )

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
            h.input([...attributes.input, h.Class('input')]),
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
      ]),
    ],
  )

export const select = <Message>(
  label: string,
  id: string,
  value: string,
  choices: ReadonlyArray<Choice>,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('field')],
    [
      h.label([h.For(id)], [label]),
      h.select(
        [h.Id(id), h.Value(value), h.OnInput(onInput), h.Class('input')],
        Array.map(choices, choice =>
          h.option([h.Value(choice.value)], [choice.label]),
        ),
      ),
    ],
  )
