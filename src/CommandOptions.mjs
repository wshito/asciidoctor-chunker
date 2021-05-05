/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import commander from 'commander';

// __VERSION__ is replaced by webpack DefinePlugin
const version = (typeof __VERSION__) !== 'undefined' ? __VERSION__ : 'dev';

const commaSeparatedList = (value, dummyPrevious) => value.split(',');

/**
 *
 * @param {Array} argv The reference to `process.argv`.
 */
export const makeConfig = (argv) => {

  const args = commander.version(version)
    .name('node asciidoctor-chunker.js')
    .usage('<single.html> [options]')
    .option('-o, --outdir <directory>',
      'The output directory where the chunked html will be written out to.', 'html_chunks')
    .option('--depth <depth specifier>', 'See the description above.', '1')
    .option('--css <paths>', 'The comma seprated list of css file paths to include.  The paths must be accesible from the current directory.', commaSeparatedList)
    .option('--no-strictMode', 'Turns off the strict mode.')
    .option('--titlePage <title string>', 'Sets title page toc string.', 'Titlepage')
    .description(`Description:
  Splits an html file generated by Asciidoctor to chunked htmls.
  The default output directory is 'html_chunks'. You can override
  it with the '-o' option.

  The default splits are made by preamble, parts, and chapters.
  You can specify the extraction level with the '--depth' option.

  If you have any custom elements inserted under <div d=#content>
  in the source single html, asciidoctor-chunker ignores it by
  default. If you want them to be included into the chunked html,
  set the option --no-strictMode. The element will be copied to
  every chunked page.

  By default asciidoctor-chunker.css is included in the
  output directory. It provides the non-opinionated page
  navigation at the bottom of every chunked page. You can
  override this by giving a comma separated list of paths
  to your custom css files. They are copied into the output
  directory so the paths must be accessible by
  asciidoctor-chunker.

The Depth Specifier:
  You can list the multiple settings by connecting each
  specifier with a comma. Each specifier is consisted of
  either a single number or a collon separated with two
  numbers.

  The single number sets the default level of extraction.
  Number 1 is the application's default and it extracts the
  chapter level. Number 2 for section extraction, 3 for
  subsection, and so on to 6 which is the maximum section
  level of Asciidoctor.

  The list of collon separated numbers, chap:level, can
  change the extraction depth for specific chapters,
  so 3:2 means chapter 3 is extracted down to 2 levels (i.e.
  section level). You can use a hyphen to specify the range
  of chapters to set as chapFrom-chapTo:level, so 1-3:5 means
  chapter 1 through 5 should be extracted with the depth
  level 5.

Example:
  --depth 2          The default level 2, all the chapters and
                     sections will be extracted.
  --depth 3,1:2,8:5  The default level 3, level 2 for Chap 1,
                     level 5 for Chap 8.
  --depth 1,3-8:2    The default level 1, level 2 for Chap 3 to 8.
  --depth 3-8:3      No default is set so default level is 1, and
                     level 3 for chap3 to 8.`)
    .parse(argv);

  // console.log(args);
  const { args: inputfile, depth, outdir, strictMode, titlePage, css = ['asciidoctor-chunker.css'] } = args;

  if (inputfile.length !== 1) {
    args.help();
  }

  const d = parseDepth(depth);

  return {
    singleHTML: inputfile[0],
    config: {
      depth: d,
      outdir,
      css,
      strictMode,
      titlePage,
    }
  };
}

/**
 * Parses the depth specifier as '1,3-5:6,8:4'
 * into an object:
 * ```
 * {
 *  default: 1,
 *  depth: {
 *    '3': 6,
 *    '4': 6,
 *    '5': 6,
 *    '8': 4
 *  }
 * }
 * ```
 * The default will be set 1 if not specified.
 *
 * @param {string} depth
 */
export const parseDepth = (depth) =>
  depth.split(',')
  .map(e => {
    const [chap, level] = e.split(':');
    return level ? parseSpecifierTerm(chap, level) : { default: +chap };
  })
  .reduce((accum, e) => accum = { ...accum, ...e }, { default: 1 });

/**
 * Parses each term (the comma separated term) of depth
 * specifier and returns the chapter-depth object.
 *
 * E.g.  chap='3-6', level='2' returns
 * ```
 * {
 *   '3': 2,
 *   '4': 2,
 *   '5': 2,
 *   '6': 2
 * }
 * ```
 *
 *
 * @param {string} chap Either 'num' or 'num-num' such as '3-9'
 *  which means from chapter 3 to 9.
 * @param level The level of extraction depth.
 * @returns the object with chapter number as a property name
 *   integer for a value.
 */
const parseSpecifierTerm = (chap, level) => {
  const [from, to] = chap.split('-').map(num => parseInt(num));
  return to ?
    // case with chap='3-6'
    new Array(to - from + 1)
    .fill(0).reduce((accum, e, i) => ({
      ...accum,
      [i + from]: +level
    }), {}) : // case with no hyphen
    {
      [from]: +level
    };
};
