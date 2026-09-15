# Contributing to Wirbel

Thank you for helping improve Wirbel. Contributions should be small,
reviewable, and easy to verify.

## Before you start

For bug fixes and small improvements, open a pull request directly. For larger
features or changes to the CLI interface, open an issue first so the behavior
and scope can be agreed upon before implementation begins.

Wirbel targets Linux and macOS. Changes for other operating systems are
welcome, but they must not break the documented behavior on either platform.

## Development setup

Wirbel requires:

- Linux or macOS
- Node.js 20 or newer
- Google Chrome or Chromium
- FFmpeg

Clone the repository and install the exact locked dependencies:

```shell
git clone https://github.com/dehenne/wirbel.git
cd wirbel
npm ci
```

Link the development version if you want to call `wirbel` globally:

```shell
npm link
wirbel --help
```

## Project structure

```text
bin/wirbel.js       Executable CLI entry point
src/cli.js          Command orchestration and user-facing output
src/options.js      Argument parsing and validation
src/renderer.js     Strudel browser and offline-audio renderer
src/converter.js    WAV, MP3, and OGG output handling
test/               Unit and integration tests
```

Strudel must remain an npm dependency. Do not copy or vendor the Strudel
source tree, editor, or generated bundles into this repository.

## Making a change

Create a focused branch from the latest `main` branch:

```shell
git switch main
git pull --rebase
git switch -c feature/short-description
```

Keep the change limited to one concern. Avoid unrelated refactoring or
formatting in the same pull request.

When changing CLI behavior:

- preserve existing options unless the change is explicitly breaking;
- provide a useful error message and a non-zero exit code on failure;
- keep output paths predictable for scripts and AI agents;
- update `--help` and the README when user-facing behavior changes;
- add or update tests for the behavior.

Treat `.strudel` files as executable code. Do not run patterns from untrusted
sources during development or review.

## Checks and tests

Run the syntax checks and unit tests before committing:

```shell
npm run check
npm test
```

Changes to rendering, browser handling, audio conversion, or dependencies must
also pass the integration test:

```shell
WIRBEL_INTEGRATION=1 npm test
```

The integration test starts a local headless browser, renders a short Strudel
pattern, and converts the resulting WAV data with FFmpeg.

## Atomic commits

Each commit should contain one complete work unit. It should be possible to
revert the commit without removing unrelated work.

Good commits include:

- adding one feature;
- fixing one bug;
- updating one related dependency set;
- documenting one behavior;
- adding tests for one behavior.

Do not combine a feature, unrelated cleanup, dependency updates, and
documentation rewrites in one commit.

## Commit messages

Commit messages follow the
[Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>[(<scope>)][!]: <short summary>
```

Examples:

```text
feat: add FLAC output
fix(renderer): register ZZFX sounds before rendering
docs: explain browser requirements
build!: require Node.js 22
```

The commit header must:

- be written in English;
- be no longer than 72 characters;
- not end with a period;
- use an imperative, present-tense summary;
- start the summary with a lowercase letter.

Use one of these commit types:

| Type | Use |
| --- | --- |
| `build` | Dependencies, package metadata, or build tooling |
| `ci` | Continuous-integration and release workflows |
| `docs` | Documentation only |
| `feat` | A new user-facing capability |
| `fix` | A bug fix |
| `perf` | A performance improvement |
| `refactor` | Code restructuring without a feature or bug fix |
| `revert` | Reverting an earlier commit |
| `style` | Formatting or style without behavior changes |
| `test` | Tests and test fixtures |

Use a scope when it makes the affected area clearer:

```text
fix(cli): reject conflicting duration options
```

### Breaking changes

Mark a breaking change with `!` and explain it in a `BREAKING CHANGE` footer:

```text
feat(cli)!: require an explicit output format

BREAKING CHANGE: Commands without --format no longer default to MP3.
```

### Commit body and footers

Use a body when a change needs additional context. Keep it focused on why the
change is necessary and any behavior that is not obvious from the diff.

Use footers to reference issues:

```text
Related: #12
Closes: #14
```

Use `Related` when a commit is connected to an issue and `Closes` when merging
the commit should close it.

## Pull requests

Open pull requests against `main`. The pull request should include:

- a concise description of the problem and solution;
- any user-visible or compatibility impact;
- the commands used to verify the change;
- an example invocation when CLI behavior changes.

Before requesting review, confirm that:

- the change is focused and contains no unrelated edits;
- `npm run check` passes;
- `npm test` passes;
- the integration test passes when rendering is affected;
- documentation and command help are current;
- no generated audio, browser profiles, credentials, or local files are
  committed.

Prefer squash merging when a pull request contains fixup commits. The final
commit message must follow the commit-message rules above.

## Releases

Contributors do not create version tags or publish npm packages directly.
The release workflow runs `semantic-release` only after changes reach `main`.
Feature branches and open pull requests never publish releases.

After the checks on `main` pass, `semantic-release` analyzes all commits since
the previous version. If it finds a releasable change, it creates the version,
Git tag, GitHub Release, and npm publication automatically. Do not edit the
version in `package.json` manually.

Release versions follow Semantic Versioning and are derived from commit
messages:

- `fix` produces a patch release;
- `feat` produces a minor release;
- `!` or a `BREAKING CHANGE` footer produces a major release.

Other commit types such as `docs`, `test`, and `ci` do not normally create a
release.

## License

By contributing to Wirbel, you agree that your contribution is licensed under
the [GNU Affero General Public License v3.0](LICENSE).
