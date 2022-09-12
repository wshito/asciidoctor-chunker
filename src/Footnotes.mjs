/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';
import { pipe } from './FP.mjs';
import { getContentNode } from './Page.mjs';

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
 * Removes the unreferred footnotes from the page and returns
 * only the referer nodes, i.e. the anchor a.footnote, validly
 * referring the footnotes within the page.  The returned valid
 * referer nodes are encapsulated in the Node instance as the
 * selections.
 *
 * @param {Set<string>} footnoteDefIds The set of all the
 *  footnote def ids within the page.  This Set is not
 *  modified in this function.
 * @param {Node} footnotesNode The Node instance of current
 *  page's #footnotes nodes of which un-referred nodes will
 *  be removed as a side effect.
 * @param {Node} referers The Node intance which holds all
 *  the referer anchors in the page.  The node is modified
 *  in this function by removing referers which do not belong
 *  this page.
 * @return {Node} the instance of valid referers that belongs
 *  this page which means they refer the footnotes defined
 *  in this page.
 */
const keepReferredFootnotes$ = (footnoteDefIds) =>
  (footnotesNode) => (referers) => {
    if (referers.length === 0) {
      footnotesNode.empty$();
      return referers;
    }
    const removingFootnotes = new Set([...footnoteDefIds]);
    // console.log("before removing", removingFootnotes.size);
    // console.log("Referers length", referers.length);
    referers.each((ele, i) => {
      removingFootnotes.delete(ele.getAttr('href').substring(1));
    });
    // console.log("after removing", removingFootnotes.size);
    removingFootnotes.forEach(id => {
      // console.log("removing", id);
      footnotesNode.remove$(`#${id}`);
    });
    return referers;
  };

/**
 * The main function which handles the footnotes and their
 * referers that belong the given page.
 *
 * @param {Function} referredFootnotesKeeper$ the curried
 *  functon of `keepReferredFootnotes$(footnoteDefIds: Map<string>)`.
 * @param {Node} node The node of the chunked page.
 */
const updateFootnotes = (referredFootnotesKeeper$) => (node) => {
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
  const rootNode = node.root();
  pipe(
    getContentNode,
    // (a) => { console.log("here1"); return a },
    _findFootnoteReferers,
    referredFootnotesKeeper$,
    _updateRefererId$,
  )(rootNode);
  return rootNode;
}

/**
 * Returns Cheerio instance of selections of footnote referers anchor elements.
 *
 * @param {Node} contentNode The `div#content` node.
 * @returns {Node} the Node instance of selections of footnote
 *   referers anchor elements.
 */
const _findFootnoteReferers = (contentNode) => contentNode.find('a.footnote');

/**
 * Converts the url `_footnotedef_4` to `_footnoteref_4`
 * where `#_footnotedef_4` is the hash link of the footnote
 * and `#_footnoteref_4` is the corresponding refererer.
 *
 * @param {string} defURL The hash link to the footnote
 *  definition as `_footnotedef_4`.
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

export {
  getFootnoteDefIds,
  keepReferredFootnotes$,
  updateFootnotes,
  _findFootnoteReferers, // exporting for testing
  _makeFootnoteRefId, // exporting for testing
  _updateRefererId$, // exporting for testing
};
