'use strict';

import * as D from './DomFunc.mjs';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';

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
 * This is the factory function that returns the function
 * which processes the nodes with 'sectN' classname
 * where N >= 1 recursively.
 *
 * This factory takes the processor callback as the argument.
 * The processor callback handles the actual task on each
 * visitng node.
 *
 * The processor is expected to have following parameters:
 *
 * @param {object} config: The configuration object which has
 *  `depth` property to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 * @param {object} config.depth The configuration to specify the
 *  maximum sectLevel to extract.  The example format is as follows:
 *  ```
 *  depth: {
 *    default: 1, // the default is to extract only chapters
 *    2: 4,  // extracts subsubsections in chap 2
 *    3: 2,  // extracts sections in chap 3
 *  }
 *  ```
 * @param {string} basename The basename of the target file.
 * @param {Cheerio} container Cheerio instance of container
 *  DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {boolean} isFirstPage true if this is the index.html page.
 *
 * By delegating the actual task to the processor callback,
 * this function can be used both for creation of ID-filename
 * hashtable as well as extracting and writing out the chapters
 * to the html file.
 *
 * The returned function from this factory can be used as
 * a callback function for the content processor, i.e.
 * the `processContents()` defined in `ContentProcessor.mjs`.
 *
 * The returned function by this factory has the following
 * parameters.
 *
 * @param {object} config: The configuration object which has
 *  `depth` property to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 * @param {object} config.depth The configuration to specify the
 *  maximum sectLevel to extract.  The example format is as follows:
 *  ```
 *  depth: {
 *    default: 1, // the default is to extract only chapters
 *    2: 4,  // extracts subsubsections in chap 2
 *    3: 2,  // extracts sections in chap 3
 *  }
 *  ```
 * @param {Cheerio} container Cheerio instance of container
 *  DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level
 *  where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {(
 *  fnamePrefix: string,
 *  thisSecLevel: number,
 *  sectionNumber: number
 *  ) => string} basenameMaker The function that generates the
 *  basename for output html.
 * @param {number} sectionNumber The section number in the
 *  current section level.
 * @param {boolean} isFirstPage true if this is the index.html page.
 */
const getChapterProcessor = (processor) => {
  // this inner function will be invoked by ContentProcessor
  const _processChapters =
    (config, container, node, thisSectLevel, fnamePrefix, basenameMaker, sectionNumber, isFirstPage) => {
      const maxLevel = config.depth[sectionNumber] || config.depth.default;
      const basename = isFirstPage ? 'index' : basenameMaker(fnamePrefix, thisSectLevel, sectionNumber);
      // case with no extraction
      if (maxLevel === thisSectLevel) {
        processor(config, basename, container, node, isFirstPage)
        return;
      }
      const childSelector = `div.sect${thisSectLevel+1}`;
      // extract myself
      processor(config, basename, container, D.remove(childSelector)(node), isFirstPage);

      // get children nodes
      const children = node.find(childSelector);
      if (children.length === 0) {
        return;
      }
      // go into children nodes to extract.
      // make sure to return to make it tail call to minimize the stack
      return children.each((i, ele) =>
        _processChapters(config, container,
          new Cheerio(ele), // ele is DOM node.  Wrap it with Cheerio object
          thisSectLevel + 1,
          basename,
          basenameMaker,
          i + 1,
          false)); // isFirstPage = false
    };
  return _processChapters;
};

/**
 * This is the factory function that returns the function
 * that extracts the chapter contents and pass them to
 * the printer function.
 *
 * The returned function has the following parameters.
 *
 * @param {object} config: The configuration object which has
 *  `depth` property to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 * @param {object} config.depth The configuration to specify the
 *  maximum sectLevel to extract.  The example format is as follows:
 *  ```
 *  depth: {
 *    default: 1, // the default is to extract only chapters
 *    2: 4,  // extracts subsubsections in chap 2
 *    3: 2,  // extracts sections in chap 3
 *  }
 *  ```
 * @param {Cheerio} container Cheerio instance of container
 *  DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level
 *  where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {(
 *  fnamePrefix: string,
 *  thisSecLevel: number,
 *  sectionNumber: number
 *  ) => string} basenameMaker The function that generates the
 *  basename for output html.
 * @param {number} sectionNumber The section number in the
 *  current section level.
 * @param {boolean} isFirstPage true if this is the index.html page.
 *
 * The returned function can be used as a callback function
 * for the content processor, i.e. the `processContents()`
 * defined in `ContentProcessor.mjs`.
 *
 * The returned function extracts the node with 'sectN' classname
 * where N >= 1 recursively and attaches to container's `div#content`.
 *
 * The `container`, where the extracted chap and sections are
 * attached to, is reused by cloning.  Make sure to create
 * a template first so you do not have to create the surrounding
 * container everytime you extract the chapters and sections.
 *
 * This factory takes the following parameters:
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer
 *  The callback function that actually handles the extracted
 *  chapter contents.  The printer function takes the basename
 *  of the output file and the Cheerio instance of the html to
 *  print out to the file.
 * @param {Cheerio} container The dom holding `div#content` as
 *  the attaching point for extracted chapters and sections.
 *  This container will be written out to a chunked html by the
 *  `printer`.
 * @param {(
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
const getChapterExtractor = (printer, container, basenameMaker,
    documentMaker) =>
  // Pass the processor function that is invoked by _processChapters().
  // The processor function is the printer to write out the html file.
  getChapterProcessor((config, basename, rootNode, node, isFirstPage) => {
    printer(basename, documentMaker(config, basename, container, node));
  });

export { getChapterExtractor, getChapterProcessor };
