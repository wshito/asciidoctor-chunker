/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
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
 * Extracts the node with 'sect*' classname recursively.
 * 
 * @param {(fnamePrefix: string, dom: object) => void} printer The callback which takes the filename prefix and html string maily to print or write out to the file.
 * @param {number} maxLevel The maximum secLevel to extract.
 * @param {Object} container jQuery object of container DOM which has the appending point: `#content`.
 * @param {Object} node The current section node extracted from DOM.
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

// const processPreamble

/**
 * Make chunked html
 *
 * @param {(fnamePrefix: string, html: string) => void} printer The callback which takes the filename prefix and html string maily to print or write out to the file.
 * @param {Cheerio} $ The instance of Cheerio.
 * @param {number} maxLevel The maximum secLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 *
 */
export const chunker = (printer, $, maxLevel) => {
  const container = makeContainer($);
  $('#content').children().each((i, node) => {
    const ele = cheerio(node);
    // if ()
  });
};
