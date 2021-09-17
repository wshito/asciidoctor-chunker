'use strict';

import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';
import { pipe } from './FP.mjs';

const addTitlepageToc$ = (config) => (rootNode) => {
  new Cheerio(`<li><a href="index.html">${config.titlePage}</a></li>`).insertBefore(rootNode.find('div#toc > ul > li:first-child'));
  return rootNode;
}

const checkTocLinks = (rootNode) => {
  if (rootNode.find('#toc a[href^=#]').length === 0)
    console.log('INFO: Your TOC has no in-document links.\n');
  return rootNode;
};

const findCurrentPageTocAnchor = (fnamePrefix) => (rootNode) =>
  rootNode.find(`#toc a[href^="${fnamePrefix}.html"]`).parent();

const markCurrent$ = node => node.addClass('current');
('class');

/**
 * Sets `current` classname on the crrent page's <li> element.
 *
 * @param {string} fnamePrefix file's basename
 * @param {Cheerio} rootNode the Cheerio instance of root node
 * @returns the Cheerio instance of root node.
 */
const setCurrentToToc = (fnamePrefix) => (rootNode) => {
  pipe(
    findCurrentPageTocAnchor(fnamePrefix),
    markCurrent$,
  )(rootNode);
  return rootNode;
}

export { addTitlepageToc$, checkTocLinks, setCurrentToToc };
