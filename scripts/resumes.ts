import {
  Array,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
} from 'effect'
import { Argument, Command } from 'effect/cli'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'
import { PDFDocument } from 'pdf-lib'

import { BunRuntime, BunServices } from '@effect/platform-bun'

import { PEOPLE } from '../job-search/domain/index.ts'
import { findExecutable } from '../job-search/state/executables.ts'
import { WorkspaceConfig } from '../job-search/state/workspace-config.ts'

export class ResumeError extends Schema.TaggedError<ResumeError>()(
  'ResumeError',
  { message: Schema.String },
) {}

const LATEX_ENGINES = ['xelatex', 'lualatex', 'tectonic'] as const
const EXPECTED_PAGES = 2
const MINIMUM_PDF_BYTES = 1000

const resumeError = (error: { readonly message: string }) =>
  new ResumeError({ message: error.message })

export const checkPdf = Effect.fn('checkPdf')(function* (
  target: string,
  expected = EXPECTED_PAGES,
) {
  const fileSystem = yield* FileSystem.FileSystem
  const contents = yield* fileSystem
    .readFile(target)
    .pipe(Effect.mapError(resumeError))
  if (contents.length < MINIMUM_PDF_BYTES) {
    return yield* new ResumeError({ message: `Empty PDF: ${target}` })
  }
  const document = yield* Effect.tryPromise({
    try: () => PDFDocument.load(contents),
    catch: cause =>
      new ResumeError({
        message: cause instanceof Error ? cause.message : String(cause),
      }),
  })
  const pages = document.getPageCount()
  if (pages !== expected) {
    return yield* new ResumeError({
      message: `${target}: expected ${expected} pages, got ${pages}`,
    })
  }
  yield* Console.log(`${target}: ${expected} pages, ${contents.length} bytes`)
})

const findEngine = Effect.fn('findEngine')(function* () {
  const found = yield* Effect.forEach(LATEX_ENGINES, engine =>
    findExecutable(engine).pipe(
      Effect.map(maybePath => Option.map(maybePath, () => engine)),
    ),
  )
  return yield* Option.match(Array.findFirst(found, Option.isSome), {
    onNone: () =>
      Effect.fail(
        new ResumeError({
          message:
            'Install XeLaTeX, LuaLaTeX or Tectonic to compile fontspec resumes',
        }),
      ),
    onSome: maybeEngine => Effect.succeed(maybeEngine.value),
  })
})

const compileArguments = (
  engine: (typeof LATEX_ENGINES)[number],
  source: string,
  output: string,
): ReadonlyArray<string> =>
  engine === 'tectonic'
    ? ['-o', output, source]
    : [
        '-no-shell-escape',
        '-halt-on-error',
        '-interaction=nonstopmode',
        `-output-directory=${output}`,
        source,
      ]

export const compileResume = Effect.fn('compileResume')(function* (
  source: string,
  maybeOutput: Option.Option<string> = Option.none(),
) {
  const config = yield* WorkspaceConfig
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const engine = yield* findEngine()
  const absoluteSource = path.resolve(source)
  const output = Option.getOrElse(maybeOutput, () =>
    path.dirname(absoluteSource),
  )
  yield* fileSystem.readFile(absoluteSource).pipe(Effect.mapError(resumeError))
  yield* fileSystem
    .makeDirectory(output, { recursive: true })
    .pipe(Effect.mapError(resumeError))
  const command = ChildProcess.make(
    engine,
    compileArguments(engine, absoluteSource, output),
    {
      cwd: config.root,
      stdin: 'ignore',
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )
  const passes = engine === 'tectonic' ? 1 : 2
  yield* Effect.forEach(
    Array.makeBy(passes, pass => pass),
    () =>
      spawner.exitCode(command).pipe(
        Effect.mapError(resumeError),
        Effect.flatMap(code =>
          code === 0
            ? Effect.void
            : Effect.fail(
                new ResumeError({
                  message: `LaTeX compilation failed (${code})`,
                }),
              ),
        ),
      ),
  )
  return path.join(output, `${path.basename(absoluteSource, '.tex')}.pdf`)
})

const buildResumes = Effect.fn('buildResumes')(function* (
  selected: ReadonlyArray<(typeof PEOPLE)[number]>,
) {
  const config = yield* WorkspaceConfig
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  yield* Effect.forEach(selected, candidate =>
    Effect.gen(function* () {
      const profile = config.profiles[candidate]
      const dist = path.join(config.root, 'dist')
      const pdf = yield* compileResume(
        path.join(config.root, profile.resume),
        Option.some(dist),
      )
      const target = path.join(dist, profile.pdf)
      yield* fileSystem.copyFile(pdf, target).pipe(Effect.mapError(resumeError))
      yield* checkPdf(target)
    }),
  )
})

const buildCommand = Command.make(
  'build',
  {
    person: Argument.Literals('person', PEOPLE).pipe(Argument.optional),
  },
  ({ person }) =>
    buildResumes(
      Option.match(person, {
        onNone: () => PEOPLE,
        onSome: candidate => [candidate],
      }),
    ),
).pipe(Command.withDescription('Compile master resumes into dist/'))

const checkCommand = Command.make(
  'check',
  {
    files: Argument.String('pdf').pipe(Argument.variadic()),
  },
  ({ files }) =>
    Effect.gen(function* () {
      const config = yield* WorkspaceConfig
      const path = yield* Path.Path
      const targets = Array.match(files, {
        onEmpty: () =>
          Array.map(PEOPLE, candidate =>
            path.join(config.root, 'dist', config.profiles[candidate].pdf),
          ),
        onNonEmpty: given => given,
      })
      yield* Effect.forEach(targets, target => checkPdf(target))
    }),
).pipe(Command.withDescription('Verify PDFs are non-empty and two pages'))

const compileCommand = Command.make(
  'compile',
  { source: Argument.String('source') },
  ({ source }) =>
    compileResume(source).pipe(Effect.flatMap(pdf => Console.log(pdf))),
).pipe(Command.withDescription('Compile one .tex file beside its source'))

const root = Command.make('resumes').pipe(
  Command.withDescription('Build and check resume PDFs'),
  Command.withSubcommands([buildCommand, checkCommand, compileCommand]),
)

export const program = Command.run(root, { version: '1.0.0' }).pipe(
  Effect.tapError(error =>
    Schema.is(ResumeError)(error) ? Console.error(error.message) : Effect.void,
  ),
  Effect.provide(WorkspaceConfig.layer),
  Effect.provide(BunServices.layer),
)

if (import.meta.main) {
  BunRuntime.runMain(program, { disableErrorReporting: true })
}
