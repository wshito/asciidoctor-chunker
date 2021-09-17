'use strict';
import { pipe } from './FP.mjs';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';
import { getContentNode$ } from './DOM.mjs';

/**
 * Returns set of footnote ids in String.
 *
 * @param footnotesNode Cheerio instance of `div#footnotes`
 * @returns {Set<string>} The Set instance with footnote ids.
 */
const getFootnoteDefIds = (footnotesNode) => {
  const fnoteDefIds = new Set();
  footnotesNode.find('div.footnote').each((i, ele) => {
    fnoteDefIds.add(new Cheerio(ele).attr('id'));
  });
  return fnoteDefIds;
};

/**
 * Adds referer id to anchor which refers to the multiply used footnote.
 * This has side effect that modifies some of referers anchor's id attribute.
 *
 * @param {cheerio} referers The Cheerio instance with the selection of
 *  nodes that refer to multiply used footnotes.
 */
const updateRefererId$ = (referers) => {
  if (referers.length === 0) return referers;
  const added = new Set();
  referers.each((i, ele) => {
    const a = new Cheerio(ele);
    if (a.attr('id')) return;
    const url = a.attr('href')
    if (added.has(url)) return;
    added.add(url);
    const refID = makeFootnoteRefId(url);
    a.attr('id', refID);
  });
  return referers;
};


/**
 * Converts the url `#_footnotedef_4` to `_footnoteref_4`.
 *
 * @param {string} defURL The hash link to the footnote definition as
 *   `_footnotedef_4`.
 * @returns corresponding referer's ID such as `_footnoteref_4`
 */
const makeFootnoteRefId = (defURL) => `_footnoteref${defURL.substring(defURL.lastIndexOf('_'))}`;

/**
 * Returns Cheerio instance of selections of footnote referers anchor elements.
 *
 * @param {Cheerio} contentNode The `div#content` node.
 * @returns {Cheerio} the Cheerio instance of selections of footnote
 *   referers anchor elements.
 */
const findFootnoteReferers = (contentNode) => contentNode.find('a.footnote');

/**
 * Removes the unreferred footnotes from the page and returns
 * the Cheerio instance with selections of all the footnote referer anchor
 * nodes.
 *
 * @param {Set<string>} footnoteDefIds The set of all the footnote def ids.
 * @param {Cheerio} footnotesNode The Cherrio instance of current page's
 *  #footnotes node.  The footnotes under this node will be modified.
 * @param {Cheerio} referers The Cheerio intance which holds found anchors that
 *  refers to a footnote.
 */
const keepReferredFootnotes$ = (footnoteDefIds) =>
  (footnotesNode) => (referers) => {
    if (referers.length === 0) {
      footnotesNode.empty().end();
      return referers;
    }
    const removingFootnotes = new Set([...footnoteDefIds]);
    // console.log("before removing", removingFootnotes.size);
    // console.log("Referers length", referers.length);
    referers.each((i, ele) => {
      // console.log(cheerio(ele).attr('href'));
      removingFootnotes.delete(new Cheerio(ele).attr('href').substring(1));
    });
    // console.log("after removing", removingFootnotes.size);
    removingFootnotes.forEach(id => {
      // console.log("removing", id);
      footnotesNode.find(`#${id}`).remove().end();
    });
    return referers;
  };

/**
 *
 * @param {Function} referredFootnotesKeeper$ the curried functon of
 *  keepReferredFootnotes$(footnoteDefIds:: Map<string>).
 * @param {Cheerio} node The root node of the chunked page.
 */
const updateFootnotes = (referredFootnotesKeeper$) => (rootNode) => {
  // each footnote definition has `<div id='_footnotedef_4' class='footnote'>`
  // the referer has
  // `<a id='_footnoteref_4' href='#_footnotedef_4' class='footnote'>
  // multiply used footnote's referer does not have id as
  // `<a href='#_footnotedef_4' class='footnote'>
  //
  // if a[href='#_footnotedef_4'] is whithin the page,
  // div#_footnotedef_4 should be kept, and
  // and id='_footnoteref_4' should be added to the first
  // a[href='#_footnotedef_4'] in the page

  // see if there are referers]
  pipe(
    getContentNode$,
    // (a) => { console.log("here1"); return a },
    findFootnoteReferers,
    referredFootnotesKeeper$,
    updateRefererId$,
  )(rootNode);
  return rootNode;
}

export {
  getFootnoteDefIds,
  updateRefererId$, // TODO exporting only for the unit test
  makeFootnoteRefId, // TODO exporting only for the unit test
  findFootnoteReferers, // TODO exporting only for the unit test
  keepReferredFootnotes$,
  updateFootnotes
};
