'use strict';

/**
 * Helper function to create the document maker function
 * for the part section.
 *
 * @param config
 * @param basename
 * @param container
 * @param partTitleNode
 * @param documentMaker
 * @returns
 */
const makePartDocument = (config, basename, container, partTitleNode, documentMaker) =>
  documentMaker(config, basename, container, ...(partTitleNode.next().hasClass('partintro') ? [partTitleNode, partTitleNode.next()] : [partTitleNode]));

/*
  extract inside the bracket:
    [#preamble]
    [.sect0, some nodes]
    [.sect1,
       +-- some nodes]
       +-- [.sect2
             +-- some nodes]
             +-- [sect3
                   +-- some nodes
                   +-- and so on...]
    [.sect1, ...]
    [.sect0, ...]

  So #preamble and .sect0 do not go into recursively.
  sect0 is for Part.  sect1 is for Chapter.
  sect1 (h2) -- sect5 (h6)
*/

/**
 * This is the factory function that returns the part extractor
 * function which extracts the part nodes with `sect0` classname.
 *
 * The returned function from this factory is to be used as a
 * callback function for the content processor, i.e. the
 * `processContents()` defined in `ContentProcessor.mjs`.
 *
 * The returned function by this factory has the following
 * parameters.
 *
 * @param {object} config: The configuration object which has
 *  `depth` property to specify the maximum sectLevel to extract.
 *  Currently `confi` is not used by the part extractor.
 * @param {Cheerio} containerRoot The dom holding `div#content` as
 *  the attaching point for extracted part sections.
 *  This container will be written out to a chunked html by the
 *  `printer`.
 * @param {Cheerio} partTitleNode The part title node that is
 *  'h1.sect0'.
 * @param {number} partNum The part number.
 * @param {boolean} isFirstPage true if this is the index.html page.
 *
 * This factory takes the following parameters:
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer
 *  The callback function that actually handles the extracted
 *  chapter contents.  The printer function takes the basename
 *  of the output file and the Cheerio instance of the html to
 *  print out to the file.
 * @param {Cheerio} container The dom holding `div#content` as
 *  the attaching point for extracted part sections.sections.
 *  This container will be written out to a chunked html by the
 *  `printer`.  This is passed and kept in closure beforehand
 *  to be used as a template repeatedly.
 * CURRENTLY UNUSED: @param {(
 *  fnamePrefix: string,
 *  thisSecLevel: number,
 *  sectionNumber: number
 *  ) => string} basenameMaker The function that generates the
 *  basename for output html.
 * @param {(
 *  config: object,
 *  basename: string,
 *  container: Cheerio,
 *  contents: Cheerio*
 * ) => {Cheerio}} documentMaker The function that creates a new
 *  container with contents (variable args) appended to the
 *  `#content` element.
 */
const getPartExtractor = (printer, container, documentMaker) =>
  (config, containerRoot, partTitleNode, partNum, isFirstPage) => {
    const basename = isFirstPage ? 'index' : `part${partNum}`;
    // printer delegates documentMaker to create the DOM for
    // the hunked html.  Printer simply prints out the DOM to
    // the file.
    printer(basename,
      makePartDocument(config, basename, container, partTitleNode, documentMaker));
  };

export default getPartExtractor;
