'use strict';

import { pipe } from './FP.mjs';
import Node from './Node.mjs';

/**
 * Adds a link to the top page based on the string
 * set in `config.titlePage`.
 *
 * @param {object} config that has `titlePage` field.
 * @returns {Node} the root node passed in the second
 *  argument.
 */
const addTitlepageToc$ = (config) => (rootNode) => {
  Node.insertHtmlBefore(`<li><a href="index.html">${config.titlePage}</a></li>`, rootNode.find('div#toc > ul > li:first-child'));
  return rootNode;
}

const checkTocLinks = (rootNode) => {
  if (rootNode.find('#toc a[href^=#]').length === 0)
    console.log('INFO: Your TOC has no in-document links.\n');
  return rootNode;
};

/**
 * Sets `current` classname on the crrent page's <li> element.
 *
 * @param {string} fnamePrefix file's basename
 * @param {Node} rootNode the Node instance of root node
 * @returns the Node instance of root node.
 */
const setCurrentToToc = (fnamePrefix) => (rootNode) => {
  pipe(
    _findCurrentPageTocAnchor(fnamePrefix),
    _markCurrent$,
  )(rootNode);
  return rootNode;
}

/**
 * Returns the `<li>` element that holds the anchor to the
 * given chunked page (fnamePrefix) in the TOC.
 *
 * @param {*} fnamePrefix 
 * @returns {Node} the `<li>` element in the TOC that
 *  surrounds the anchor to the given chunked page.
 */
const _findCurrentPageTocAnchor = (fnamePrefix) => (rootNode) =>
  rootNode.find(`#toc a[href^="${fnamePrefix}.html"]`).parent();

const _markCurrent$ = node => node.addClass$('current');

export { addTitlepageToc$, checkTocLinks, setCurrentToToc };
