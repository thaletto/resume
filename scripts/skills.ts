import {
  Array,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  String,
} from 'effect'

import { BunRuntime, BunServices } from '@effect/platform-bun'

const SOURCE = '.agents/skills'
const CLAUDE_SKILLS = '.claude/skills'
const OPENCODE_COMMANDS = '.opencode/command'
const USER_INVOKED = 'disable-model-invocation: true'

const frontmatterValue = (contents: string, key: string): string =>
  Option.match(
    Array.findFirst(String.split(contents, '\n'), line =>
      line.startsWith(`${key}:`),
    ),
    {
      onNone: () => '',
      onSome: line => line.slice(key.length + 1).trim(),
    },
  )

const opencodeCommand = (name: string, description: string): string =>
  [
    '---',
    `description: ${description}`,
    '---',
    '',
    `Read \`${SOURCE}/${name}/SKILL.md\` and follow it. Arguments: $ARGUMENTS`,
    '',
  ].join('\n')

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const names = yield* fileSystem.readDirectory(SOURCE)

  yield* fileSystem.makeDirectory(OPENCODE_COMMANDS, { recursive: true })
  const synced = yield* Effect.forEach(names, name =>
    Effect.gen(function* () {
      const skillFile = path.join(SOURCE, name, 'SKILL.md')
      if (!(yield* fileSystem.exists(skillFile))) {
        return []
      }
      yield* fileSystem.copy(
        path.join(SOURCE, name),
        path.join(CLAUDE_SKILLS, name),
        { overwrite: true },
      )
      const contents = yield* fileSystem.readFileString(skillFile)
      if (!contents.includes(USER_INVOKED)) {
        return []
      }
      yield* fileSystem.writeFileString(
        path.join(OPENCODE_COMMANDS, `${name}.md`),
        opencodeCommand(name, frontmatterValue(contents, 'description')),
      )
      return [name]
    }),
  )
  yield* Console.log(
    `Copied ${names.length} skills to ${CLAUDE_SKILLS}; opencode commands: ${Array.join(Array.flatten(synced), ', ')}`,
  )
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}
