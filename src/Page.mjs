/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import { getChapterExtractor } from './Chapters.mjs';
import processContents from './ContentProcessor.mjs';
import { insertCSS, extractCSS } from './CSS.mjs';
import {
  getFootnoteDefIds,
  keepReferredFootnotes$,
  updateFootnotes
} from './Footnotes.mjs';
import { pipe } from './FP.mjs';
import makeHashTable from './MakeHashTable.mjs';
import Node from './Node.mjs';
import getPartExtractor from './Parts.mjs';
import getPreambleExtractor from './Preamble.mjs';
import {
  addTitlepageToc$,
  checkTocLinks,
  setCurrentToToc
} from './TOC.mjs';

/**
 * Returns the Node instance of `div#content`.
 *
 * @param {Node} rootNode
 * @returns {Node} the `div#content` node.
 */
export const getContentNode = (rootNode) => rootNode.find('#content');

/**
 * Make chunked html.  This is the main function to extract
 * whole book of adoc html file.
 * This function does not return anything.  This takes
 * a printer function for side effect.
 *
 * @param {(fnamePrefix: string, node: Node) => void} printer
 *  The callback which takes the filename prefix (the base name of
 *  the html file) and the current node mainly to print or write out
 *  to files.
 * @param {Node} rootNode The root node.
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
export const makeChunks = (printer, rootNode, config, basenameMaker) => {
  const ht = makeHashTable(rootNode, config); // Map<id, filename>
  const linkRewriter = _updateLinks(ht);
  const container = pipe( // runs from the top
    _makeContainer(config),
    checkTocLinks,
    linkRewriter,
    extractCSS(config.outdir),
    insertCSS(config),
    addTitlepageToc$(config)
  )(rootNode);
  const footnotesKeeper$ =
    keepReferredFootnotes$(getFootnoteDefIds(container.find('#footnotes')));
  // delegates recursive processing to processContents()
  // by passing three processors to handle each contents.
  processContents(
    getPreambleExtractor(printer, container,
      _getDocumentMaker(footnotesKeeper$, ht)),
    getPartExtractor(printer, container,
      _getDocumentMaker(footnotesKeeper$, ht)),
    getChapterExtractor(printer, container,
      _getDocumentMaker(footnotesKeeper$, ht)),
    rootNode,
    config,
    basenameMaker);
}

const _addPageNavigation = (basename, { filename2pageNum, filenameList }) =>
  (rootNode) => {
    const thisPageNum = filename2pageNum[`${basename}.html`];
    const prev = thisPageNum > 0 ? filenameList[thisPageNum - 1] : null;
    const next = thisPageNum < filenameList.length - 1 ? filenameList[thisPageNum + 1] : null;
    const html = _createNav(prev, next);
    const div = rootNode.find('body > div:last-of-type');
    if (div.getAttr('id') === 'footer')
      Node.insertHtmlBefore(html, div);
    else
      Node.insertHtmlAfter(html, div);

    return rootNode;
  };

const _createNav = (prev, next) => `
<nav>
  ${prev ?
    `<a rel="prev" href="${prev}" class="nav nav-prev"
        title="Previous page"
        aria-label="Previous page"
        aria-keyshortcuts="Left">
        <i class="fa fa-angle-left"></i>
     </a>` : ''}
  ${next ?
    `<a rel="next" href="${next}" class="nav nav-next"
        title="Next page"
        aria-label="Next page"
        aria-keyshortcuts="Right">
        <i class="fa fa-angle-right"></i>
     </a>` : ''}
  <div style="clear: both"></div>
</nav>
`;

const _insertScript = (rootNode) => {
  rootNode.find('html').appendHTML$(`
  <script>
  function isInViewport(ele) {
    const rect = ele.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
  }
  function yPosition (ele) {
    const rect = ele.getBoundingClientRect();
    return (rect.top - 20); // 20px above
  }
  let curr = document.getElementsByClassName('current');
  if (!isInViewport(curr[curr.length - 1])) {
    document.getElementById('toc').scrollTo({
      top: yPosition(curr[0]),
      left: 0,
      behavior: 'smooth'
    });
  }

  /* For page navigation */
  function gotoPage(selector) {
    const button = document.querySelector(selector);
    if (button)
      window.location.href = button.href;
  }
  document.addEventListener('keydown', e => {
    if (e.shiftKey)
      return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        gotoPage('.nav-next');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        gotoPage('.nav-prev');
        break;
    }
  });
  </script>
  `);
  return rootNode;
}

/**
 * Creates a new container page with `div#content` is empty from
 * the given DOM tree.  The created container's DOM is independent
 * from the given DOM.
 *
 * @param {Node} rootNode The root node of the Node instance 
 * @param {boolean} isStictMode true if extraction mode
 *  is in strict mode.  In strict mode, asciidoctor-chunker
 *  assumes there are only defult contents under div#content.
 *  If the mode is not strict, makeContainer() leaves unknown
 *  contents under div#content untouched.
 *  The default is false or undefined.
 *
 */
export const _makeContainer = (config) => (rootNode) => {
  const { strictMode } = config;
  const root = rootNode.clone().remove$('#content > #preamble, #content > .partintro, #content > .sect1, #content > .sect0');
  const content = root.find('#content');
  if (strictMode) { // in strict mode
    if (content.children().length > 0) {
      _showStrictModeMessage(content);
      content.empty$();
    }
  }
  return root;
}

/**
 * The factory function for DocumentMaker.
 * This function creates a new container with contents
 * appended at #content element.  The contents is also cloned
 * internally before appended.
 *
 * @param {Function} referredFootnotesKeeper$ the curried functon of
 *  keepReferredFootnotes$(footnoteDefIds:: Map<string>).
 * @param {Map<id, filename>} hashtable The hashtable of
 *  (key, value) = (id, filename), plus the
 *  ('navigation', {filename, pageNum})
 * @param {Node} container The Node instance of page skelton
 *  where the #content element is the appending point for the
 *  contents.  This function does not touch the passed container.
 *  The container is cloned and then attach the contents.
 * @param {Node} contents The contents node to be appended to
 *  the container.  The contents are cloned internally and
 *  then appended.
 * @returns The newly created Node instance of the document
 *  with contents appended.
 */
// TODO Original name was _makeDocument().  Change the test case accordingly
export const _getDocumentMaker = (referredFootnotesKeeper$, hashtable) =>
  (config, basename, container, ...contents) => {
    const linkRewriter = _updateLinks(hashtable);
    const nodes = contents.map(linkRewriter);
    const newContainer = container.clone();
    const divFootnotes = newContainer.find('#footnotes');
    return pipe(
      getContentNode,
      Node.appendNodesToTarget$(...nodes), // clones the contents
      updateFootnotes(referredFootnotesKeeper$(divFootnotes)),
      _addPageNavigation(basename, hashtable.get('navigation')),
      setCurrentToToc(basename),
      _insertScript,
    )(newContainer);
  };

const _showStrictModeMessage = (contentNode) => {
  // const getNodeInfo = node => `tag=${node.tagName} id=${node.getAttr('id')}, class=${node.getAttr('class')}`;

  console.log(`INFO: Non-Asciidoc contents encountered under <div id='#content'>.
INFO: They are ignored and not included in chunked html by default.
INFO: If you want them to be included, use the '--no-strictMode' command option.`);
  contentNode.html().trim().split(/\n+/).forEach(line => console.log(`INFO: Found content => ${line}`));
  console.log();
};

/**
 * @param {Map<id, url>} ht the Hashtable of <id, url>.  If id is 'foo' then
 *  url is 'filename.html#foo' where the filename is where the id is defined.
 */
const _updateLinks = (ht) => (node) => {
  node.find('a[href^=#]').each((a, i) => {
    const url = a.getAttr('href');
    // footnote is always whithin the chunked page so no need to rewrite
    if (!url.startsWith('#_footnotedef_') &&
      !url.startsWith('#_footnoteref_')) {
      const id = url.substring(1);
      const newURL = ht.get(id);
      if (newURL) {
        a.setAttr$('href', newURL);
      } else { // when target URL is missing (undefined)
        const newClass = a.getAttr('class') ?
          `${a.getAttr('class')} target-missing` : 'target-missing';
        a.setAttr$('href', `#${id}`);
        a.setAttr$('class', newClass);
      }
    }
  });
  return node;
}
