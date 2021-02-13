/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

/**
 * Returns a new DOM wrapped with the jQuery interface.
 *
 * @param {string} filename
 * @returns the DOM wrapped with the jQuery interface.
 */
export function newDOM (filename) {
  return cheerio.load(fs.readFileSync(filename));
}

const childClassName = className => {}


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
 * Extracts the node with 'sectN' classname where N >= 1
 * recursively.  This function does not return anything.
 * This takes printer function for side effect.
 * 
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to the file.
 * @param {number} maxLevel The maximum secLevel to extract.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSecLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {number} sectionNumber The section number in the current section level.
 */
export const extract = (printer, maxLevel, container, node, thisSecLevel, fnamePrefix, sectionNumber) => {
  // case with no extraction
  if (maxLevel === thisSecLevel) {
    printer(`${fnamePrefix}-${sectionNumber}`, container.clone().find('#content').append(node.clone()).end());
    return;
  }
  const childSelector = `div.sect${thisSecLevel+1}`;
  // extract myself
  printer(`${fnamePrefix}-${sectionNumber}`, container.clone().find('#content').append(node.clone().find(childSelector).remove().end()).end());

  // get children nodes
  const children = node.find(childSelector);
  if (children.length === 0) {
    return;
  }
  // go into children nodes to extract.
  // make sure to return to make it tail call to minimize the stack
  return children.each((i, ele) =>
    extract(printer, maxLevel, container,
      cheerio(ele), // ele is DOM node.  Wrap it with Cheerio object
      thisSecLevel + 1,
      `${fnamePrefix}-${sectionNumber}`, i + 1));
}

/**
 * Creates new DOM with empty content.
 *
 * @param {Cheerio} $ The instance of Cheerio.
 */
export const makeContainer = $ => cheerio($.root().clone().find('#content').empty().end());

/**
 * 
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} preambleNode The preamble node that is 'div#preamble'.
 */
export const extractPreamble = (printer, container, preambleNode) => {
  printer('0', container.clone().find('#content').append(preambleNode.clone()).end());
}

/**
 * 
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} partTitleNode The part title node that is 'h1.sect0'.
 * @param {number} partNum The part number.
 */
export const extractPart = (printer, container, partTitleNode, partNum) => {
  printer(`${partNum}`,
    container.clone()
    .find('#content')
    .append(partTitleNode.clone())
    // TODO test if the part has next content and then append
    // if (node.next().hasClass('partintro'))
    .append(partTitleNode.next().clone())
    .end());
}

export const printer = outDir => (fnamePrefix, dom) => {
  const fname = path.format({
    dir: outDir,
    base: `${fnamePrefix}.html`
  });
  fs.writeFile(fname, dom.html(), err => {
    if (err)
      console.log("File write error:", fname);
    console.log(fname);
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
 * @param {number} maxLevel The maximum secLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 *
 */
export const makeChunks = (printer, $, maxLevel) => {
  const container = makeContainer($);
  let chap = 0;
  let part = 0;
  $('#content').children().each((i, ele) => {
    const node = cheerio(ele);
    if (node.hasClass('partintro'))
      return; // ignore. this is taken care by part extraction
    if (node.hasClass('sect1'))
      return extract(printer, maxLevel, container, node, 1, `${part}`, ++chap); // recursive extraction of chapters
    if (node.hasClass('sect0'))
      return extractPart(printer, container, node, ++part); // part extraction
    if (node.attr('id') === 'preamble')
      return extractPreamble(printer, container, node);

    console.log('Woops, unknown contents here to be processed.')
  });
};
