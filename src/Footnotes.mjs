'use strict';
import { pipe } from './FP.mjs';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';
import { getContentNode$ } from './DOM.mjs';

/**
 * Returns the Set instance which contains all the footnote
 * ids defined in the page.
 *
 * @param {Node} footnotesNode the node of `div#footnotes`
 *  which is the container of all the footnotes defined in
 *  the page.
 * @returns {Set<string>} The Set instance with footnote ids.
 */
const getFootnoteDefIds = (footnotesNode) => {
  const fnoteDefIds = new Set();
  footnotesNode.find('div.footnote').each((ele, i) => {
    fnoteDefIds.add(ele.getAttr('id'));
  });
  return fnoteDefIds;
};

/**
 * Returns Cheerio instance of selections of footnote referers anchor elements.
 *
 * @param {Cheerio} contentNode The `div#content` node.
 * @returns {Cheerio} the Cheerio instance of selections of footnote
 *   referers anchor elements.
 */
const _findFootnoteReferers = (contentNode) => contentNode.find('a.footnote');

/**
 * Converts the url `_footnotedef_4` to `_footnoteref_4`
 * where `#_footnotedef_4` is the hash link of the footnote
 * and `#_footnoteref_4` is the corresponding refererer.
 *
 * @param {string} defURL The hash link to the footnote definition as
 *   `_footnotedef_4`.
 * @returns corresponding referer's ID such as `_footnoteref_4`
 */
const _makeFootnoteRefId = (defURL) => `_footnoteref${defURL.substring(defURL.lastIndexOf('_'))}`;

/**
 * Each footnote has an anchor that links back to its refererer.
 * When a footnote is multiply referred, the footnote links back
 * to only its first referer.  Other referers should not have
 * referer ID.  This function appropriately sets the
 * first referer's ID URL to the footnote's anchor.
 *
 * This has side effect that modifies some of referers anchor's
 * id attribute.
 *
 * @param {Node} referers The Node instance with the selection of
 *  referer nodes in the current page.  The selection possibly
 *  contains nodes referring different footnotes as well as
 *  nodes referring the same footnote.
 */
const _updateRefererId$ = (referers) => {
  if (referers.length === 0) return referers;
  const linkedBackReferers = new Set();
  referers.each((a, i) => {
    // if already has an id, this is the first referer
    // in the original single html page
    const id = a.getAttr('id');
    const url = a.getAttr('href')
    if (id) {
      linkedBackReferers.add(url);
      return;
    }
    if (linkedBackReferers.has(url)) return;
    linkedBackReferers.add(url);
    const refID = _makeFootnoteRefId(url);
    a.setAttr$('id', refID);
  });
  return referers;
};

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
    _findFootnoteReferers,
    referredFootnotesKeeper$,
    _updateRefererId$,
  )(rootNode);
  return rootNode;
}

export {
  getFootnoteDefIds,
  _findFootnoteReferers,
  _makeFootnoteRefId,
  _updateRefererId$,
  keepReferredFootnotes$,
  updateFootnotes
};
