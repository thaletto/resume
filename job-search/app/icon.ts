import { Array, Option, Record } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type IconData = ReadonlyArray<
  readonly [string, { readonly [key: string]: string | number }]
>

const toAttributeName = (key: string): string =>
  key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

export const icon = <Message>(
  data: IconData,
  h: HtmlBuilder<Message>,
  size = 24,
): Html => {
  const shapes = new Map([
    ['path', h.path],
    ['circle', h.circle],
    ['rect', h.rect],
    ['line', h.line],
    ['polyline', h.polyline],
    ['polygon', h.polygon],
    ['ellipse', h.ellipse],
  ])
  return h.svg(
    [
      h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
      h.Attribute('width', String(size)),
      h.Attribute('height', String(size)),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.AriaHidden(true),
      h.Class('icon'),
    ],
    Array.flatMap(data, ([tag, attributes]) =>
      Option.match(Option.fromNullishOr(shapes.get(tag)), {
        onNone: () => [],
        onSome: shape => [
          shape(
            Array.flatMap(Record.toEntries(attributes), ([key, value]) =>
              key === 'key'
                ? []
                : [h.Attribute(toAttributeName(key), String(value))],
            ),
          ),
        ],
      }),
    ),
  )
}
