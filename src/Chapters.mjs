/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import Node from './Node.mjs';

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
 * The processor function expects the following parameters:
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
 * @param {Node} docRoot The root Node instance of the asciidoctor's
 *  single HTML source.
 * @param {Node} node The current section node extracted from DOM.
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
 * @param {Node} docRoot The root Node instance of the asciidoctor's
 *  single HTML source.
 * @param {Node} node The current section node extracted from DOM.
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
  const _processChapters = (config, docRoot, node, thisSectLevel, fnamePrefix, basenameMaker, sectionNumber, isFirstPage) => {
    const maxLevel = config.depth[sectionNumber] || config.depth.default;
    const basename = isFirstPage ? 'index' : basenameMaker(fnamePrefix, thisSectLevel, sectionNumber);
    // case with no extraction
    if (maxLevel === thisSectLevel) {
      processor(config, basename, docRoot, node, isFirstPage)
      return;
    }
    const childSelector = `div.sect${thisSectLevel+1}`;
    // extract myself
    processor(config, basename, docRoot,
      node.clone().remove$(childSelector), isFirstPage);

    // get children nodes
    const children = node.find(childSelector);
    if (children.length === 0) {
      return;
    }
    // go into children nodes to extract.
    // make sure to return to make it tail call to minimize the stack
    return children.each((ele, i) =>
      _processChapters(config, docRoot,
        ele, // the Node instance
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
 * This function utilizes `getChapterProcessor(processor)` 
 * to embed the printer function and the document maker function
 * as a processor.  So the returned function expects the
 * same parameters as described in `getChapterProcessor()`.
 *
 *
 * @param {(fnamePrefix: string, dom: Node) => void} printer
 *  The callback function that actually handles the extracted
 *  chapter contents.  The printer function takes the basename
 *  of the output file and the Node instance of the html to
 *  print out to the file.
 * @param {Node} container The dom of the root which has
 *  empty `div#content`.  Use this as a skelton.
 * The `printer` uses the clone of this DOM to write out the
 * chunker html.
 * @param {(
 *  fnamePrefix: string,
 *  thisSecLevel: number,
 *  sectionNumber: number
 *  ) => string} basenameMaker The function that generates the
 *  basename for output html.
 * @param {(
 *  config: object,
 *  basename: string,
 *  container: Node,
 *  contents: Node*
 * ) => {Node}} documentMaker This function should clone the
 *  given container to append nodes to div#content.
 */
const getChapterExtractor = (printer, container, documentMaker) =>
  // Pass the processor function that is invoked by _processChapters().
  // The processor function is the printer to write out the html file.
  getChapterProcessor(
    // docRoot is the DOM of single html source
    (config, basename, docRoot, node, isFirstPage) => {
      printer(basename,
        // container is the DOM root of which div#content is empty
        documentMaker(config, basename, container, node));
    });

export { getChapterExtractor, getChapterProcessor };
