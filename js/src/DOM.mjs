/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import { pipe } from './Utils.mjs';
import * as dom from './DomFunc.mjs';

/*
 * Module to provide the Asciidoctor single HTML specific
 * DOM manipulations.
 */

/**
 * Returns a new DOM wrapped with the jQuery interface.
 *
 * @param {string} filename
 * @returns the DOM wrapped with the jQuery interface.
 */
export function newDOM (filename) {
  return cheerio.load(fs.readFileSync(filename));
}

/**
 * Returns the div#content node where all the document
 * contents are appended to.
 * 
 * @param {Cheerio} node The DOM which has #content node.
 */
export const getContentNode$ = node => dom.find$('#content')(node);

/**
 * This function creates a new container with contents
 * appended at #content element.  The contents is also cloned
 * internally before appended.
 *
 * @param {Cheerio} container The Cheerio instance of DOM which
 *  has #content element to append the contents.  This function
 *  does not touch the passed container.  The container is cloned
 *  and then attach the contents.
 * @param {Cheerio} contents The Cheerio instance of DOM node
 *  to be appended to the container.  The contents are cloned
 *  internally and then appended.
 * @returns The newly created Cheerio instance of the document
 *  with contents appended.
 */
const makeDocument = (container, ...contents) =>
  pipe(
    dom.clone,
    getContentNode$,
    dom.append$(...contents) // dom.append$() clones contents
  )(container);

/**
 * Creates the basename for output html file based on
 * the section level and section number.  Eg. chap1, chap1_sec3-2.
 * @param {string} fnamePrefix 
 * @param {number} thisSecLevel 
 * @param {number} sectionNumber 
 */
const basename = (fnamePrefix, thisSecLevel, sectionNumber) =>
  thisSecLevel === 1 ? `${fnamePrefix}${sectionNumber}` :
  thisSecLevel === 2 ? `${fnamePrefix}_sec${sectionNumber}` : `${fnamePrefix}-${sectionNumber}`;

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
 * @param {number} sectionNumber The section number in the current section level.
 * @param {boolean} isFirstPage true if this is the index.html page.
 */
export const processChapters = processor => {
  const _processChapters =
    (config, container, node, thisSectLevel, fnamePrefix, sectionNumber, isFirstPage) => {
      const maxLevel = config.depth[sectionNumber] || config.depth.default;
      const filename = isFirstPage ? 'index' : basename(fnamePrefix, thisSectLevel, sectionNumber);
      // case with no extraction
      if (maxLevel === thisSectLevel) {
        processor(filename, container, node)
        return;
      }
      const childSelector = `div.sect${thisSectLevel+1}`;
      // extract myself
      processor(filename, container, dom.remove(childSelector)(node));

      // get children nodes
      const children = node.find(childSelector);
      if (children.length === 0) {
        return;
      }
      // go into children nodes to extract.
      // make sure to return to make it tail call to minimize the stack
      return children.each((i, ele) =>
        _processChapters(config, container,
          cheerio(ele), // ele is DOM node.  Wrap it with Cheerio object
          thisSectLevel + 1,
          filename, i + 1));
    };
  return _processChapters;
};

/**
 * Creates new DOM with empty content.
 *
 * @param {Cheerio} $ The instance of Cheerio.
 */
export const makeContainer = $ => dom.empty('#content')($.root());

/**
 *
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} preambleNode The preamble node that is 'div#preamble'.
 */
export const extractPreamble = (printer) =>
  (container, preambleNode, isFirstPage) => {
    const basename = isFirstPage ? 'index' : 'preamble';
    printer(basename, makeDocument(container, preambleNode));
  }

const makePartDocument = (container, partTitleNode) =>
  makeDocument(container,
    ...(partTitleNode.next().hasClass('partintro') ? [partTitleNode, partTitleNode.next()] : [partTitleNode]));

/**
 *
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} partTitleNode The part title node that is 'h1.sect0'.
 * @param {number} partNum The part number.
 */
export const extractPart = (printer) =>
  (container, partTitleNode, partNum, isFirstPage) => {
    const basename = isFirstPage ? 'index' : `part${partNum}`;
    printer(basename, makePartDocument(container, partTitleNode));
  };

/**
 * Extracts the node with 'sectN' classname where N >= 1
 * recursively.  This function does not return anything.
 * This takes printer function for side effect.
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to the file.
 * @param {number} maxLevel The maximum secLevel to extract.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {number} sectionNumber The section number in the current section level.
 */
export const extractChapters = (printer) =>
  processChapters((filename, container, node, isFirstPage) => {
    printer(filename, makeDocument(container, node));
  });

/**
 * Visit the nodes under the #content node and invoke
 * the given processors.
 *
 * The visiting nodes processing has been abstracted so the
 * creation of ID-filename hashtable can also use this code.
 *
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} $ The instance of Cheerio.
 * @param {object} config: The configuration object which has
 *  `depth` object to specify the maximum sectLevel to extract.
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
 */
const processContents = (
  preambleProcessor, partProcessor, chapterProcessor, $, config) => {
  const container = makeContainer($);
  let chap = 0;
  let part = 0;
  $('#content').children().each((i, ele) => {
    const node = cheerio(ele);
    const isFirstPage = i === 0;
    if (node.hasClass('partintro'))
      return; // ignore. this is taken care by part extraction
    if (node.hasClass('sect1'))
      return chapterProcessor(config, container, node, 1, 'chap',
        ++chap, isFirstPage); // recursive extraction of chapters
    if (node.hasClass('sect0'))
      return partProcessor(container, node, ++part, isFirstPage); // part extraction
    if (node.attr('id') === 'preamble')
      return preambleProcessor(container, node, isFirstPage);

    console.log('Woops, unknown contents here to be processed.')
  });
};

export const printer = outDir => (fnamePrefix, dom) => {
  const fname = path.format({
    dir: outDir,
    base: `${fnamePrefix}.html`
  });
  fs.writeFile(fname, dom.html(), err => {
    if (err)
      console.log("File write error:", fname);
    // console.log(fname);
  });
}

/**
 * Make chunked html.  This is the main function to extract
 * whole book of adoc html file.
 * This function does not return anything.  This takes
 * a printer function for side effect.
 * 
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} $ The instance of Cheerio.
 * @param {object} config: The configuration object which has
 *  `depth` object to specify the maximum sectLevel to extract.
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
 */
export const makeChunks = (printer, $, config) => {
  // delegates recursive processing to processContents()
  // by passing three processors to handle each contents.
  processContents(
    extractPreamble(printer),
    extractPart(printer),
    extractChapters(printer),
    $,
    config);
}
