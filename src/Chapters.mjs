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
 * Process the nodes with 'sectN' classname where N >= 1
 * recursively.  This function does not return anything.
 * This takes processor callback to handle actual task
 * on each visitng nodes.
 *
 * The visiting nodes processing has been abstracted
 * so the creation of ID-filename hashtable can also
 * use this code.
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} processor
 *  The callback which takes the filename prefix and Cheerio
 *  instance and do some chapter content processing.
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
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {(string, number, number) => string} basenameFn The function
 *  that returns the basename of the html file given the information.
 * @param {number} sectionNumber The section number in the current section level.
 * @param {boolean} isFirstPage true if this is the index.html page.
 */
const processChapters = (processor) => {
  // this inner function will be invoked by ContentProcessor
  const _processChapters =
    (config, container, node, thisSectLevel, fnamePrefix, basenameFn,
      sectionNumber, isFirstPage) => {
      const maxLevel = config.depth[sectionNumber] || config.depth.default;
      const filename = isFirstPage ? 'index' : basenameFn(fnamePrefix, thisSectLevel, sectionNumber);
      // case with no extraction
      if (maxLevel === thisSectLevel) {
        processor(config, filename, container, node, isFirstPage)
        return;
      }
      const childSelector = `div.sect${thisSectLevel+1}`;
      // extract myself
      processor(config, filename, container, D.remove(childSelector)(node), isFirstPage);

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
          filename,
          basenameFn,
          i + 1,
          false)); // isFirstPage = false
    };
  return _processChapters;
};

/**
 * Extracts the node with 'sectN' classname where N >= 1
 * recursively and attaches to container's `div#content`.
 * This function does not return anything.
 * This takes printer function for side effect.
 *
 * First two args `printer` and `container` is curried.  The container,
 * where the extracted chap and sections are attached to, is reused by
 * cloning.  Make sure to create a template first so you do not have
 * to create the currounding container verytime you extract the chapters
 * and sections.
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback
 *  which takes the filename prefix and Cheerio instance maily to print or
 *  write out to the file.
 * @param {Cheerio} container The dom holding `div#content` as a attaching point
 *  for extracted chapters and sections.  This is passed and kept in closure
 *  beforehand to be used as a template repeatedly.
 * @param {number} maxLevel The maximum secLevel to extract.
 * @param {Cheerio} rootNode The Cheerio instance of the root node where
 *   this chapter `node` is extracted from.  This argument is not used in
 *   this function.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {number} sectionNumber The section number in the current section level.
 */
const extractChapters = (printer, container, basenameMaker,
    documentMaker) =>
  // the argument is the processor function that will be used
  // inside the processChapters().
  processChapters((config, basename, rootNode, node, isFirstPage) => {
    printer(basename, documentMaker(config, basename, container, node));
  });

export { extractChapters, processChapters };
