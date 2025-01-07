# Changelog

All notable changes to this project will be documented in this file.


## Unreleased

## v1.0.7 (2025-01-07)
### Fixed
- The command line parsing error with the commander.js v13.0.0 is fixed.

### Security
- Updated all the dependencies and fixed the vulnerabilities.

## v1.0.6 (2023-02-20)
### Fixed
- Prevents page navigation with Shift+[Right/Left] arrow key.  (PR [#42] (https://github.com/wshito/asciidoctor-chunker/pull/42) from @chloekek)

## v1.0.5 (2022-09-14)
### Added
- The `target-missing` class attribute is added to the anchor whose target is missing. (Issue [#22](https://github.com/wshito/asciidoctor-chunker/issues/22))

### Changed
- All the changes are now kept in `CHANGELOG.md` file.
- Major refactoring on entire codebase.
- Updated to the latest version of all the dependencies.
- Supports Node.js v18.x (Issue [#38](https://github.com/wshito/asciidoctor-chunker/issues/38))
- Improved help text (PR [#24](https://github.com/wshito/asciidoctor-chunker/pull/24) from @tajmone).

### Fixed
- `npm` installs the shebang script instead of `src/index.mjs`. (Issue [#25](https://github.com/wshito/asciidoctor-chunker/issues/25))
- Fixed the `undefined` url when the target link is missing.  The `target-missing` class attribute is added to the anchor whose target is missing.  (Issue [#22](https://github.com/wshito/asciidoctor-chunker/issues/22))
- Properly handles the data URLs.  (Issue [#23](https://github.com/wshito/asciidoctor-chunker/issues/23))

### Security
- Fixed the vulnerabilities from the dependencies on ansi-regex, nth-check, trim-off-newlines, Minimist.

## v1.0.4 (2021-08-03)
### Added
- Keyboard shortcuts for the page navigation with arrow keys.
- Accessibility labels on the page navigation for screen readers.

## v1.0.3 (2021-06-25)
### Security
- Fixed the security vulnerabilities in the dependencies.

## v1.0.2 (2021-05-09)
### Added
- The `--titlePage` option that enables the custom toc label for the titlepage (PR [#11](https://github.com/wshito/asciidoctor-chunker/pull/11) from @johnthad).

## v1.0.1 (2021-03-17)
### Added
- The shebang in the main script.

### Changed
- The project is published on [npm](https://www.npmjs.com/package/asciidoctor-chunker).

## v1.0.0 (2021-02-27)
### Added
- The non opinionated page navigation at the bottom of each page.
- You can insert custom css from the command line with `--css` option.
- If you have any custom elements inserted in the source html, they are handled in non-strict mode by setting `--no-strictMode` option.
- Gives warning if no relative links are available in tocs.
- The current page toc is highlighted and scrolled into view.

## v0.9 (2021-02-20)
- Re-implemented in JavaScript which is the complete re-write from the previous Lisp version.
- The new JavaScript version can control any depth of sections to split.  And even more, each chapter can have a different depth extraction level.
- Runs very fast!

## v0.1 (2021-02-20)
- Archived the stable Lisp version as v0.1 and moved to `legacy-code` directory.
- Started to work on the more enhanced version in `javascript` branch.

## Bug Fix (2019-01-24)
- Supressed the waring message for cl-fad dependency (Issue [#6](https://github.com/wshito/asciidoctor-chunker/issues/6) fixed by @snmsts).

## Locally linked files are copied (2018-07-11)
- Locally linked files with `link` and `script` tags with relative paths are copied to the destination directory keeping the structure of the relative path.  So the custom CSS and script files should be properly copied by `asciidoctor-chunker` (Issue [#2](https://github.com/wshito/asciidoctor-chunker/issues/2)).

## Renamed to asciidoctor-chunker (2018-03-23)
- The project name is now `asciidoctor-chunker`. ([commit](https://github.com/wshito/asciidoctor-chunker/commit/da9d6dd41eeb5301cba899de2e6de4835a17f775))

## Most of the features are implemented (2018-03-19)
- Only locally referenced images are copied.
  ([commit](https://github.com/wshito/asciidoctor-chunker/commit/75e76ede2a0ea4e52d5999e030db9c3a4dc94b18))

## First working version (2018-03-12)
- The first working version. ([commit](https://github.com/wshito/asciidoctor-chunker/commit/0d43d5b026a8ae193e311c7c09017b22acd182d3))
- The project name has changed to `asciidoc-chunker`. ([commit](https://github.com/wshito/asciidoctor-chunker/commit/8a0994a92d66ebe2f74aed0790ccfeb5b3dc8840))

## Initiated the project (2018-03-09)
- The `adoc-chunker` project began. ([commit](https://github.com/wshito/asciidoctor-chunker/commit/c3dba6db4a6e8584b16a4c5b27e0fa158c26c581))

