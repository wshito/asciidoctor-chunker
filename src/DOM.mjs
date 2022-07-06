/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';
import { pipe } from './FP.mjs';
import * as D from './DomFunc.mjs';
import processContents from './ContentProcessor.mjs';
import { getChapterExtractor } from './Chapters.mjs';
import getPartExtractor from './Parts.mjs';
import getPreambleExtractor from './Preamble.mjs';
import {
  addTitlepageToc$,
  checkTocLinks,
  setCurrentToToc
} from './TOC.mjs';
import getFilenameMaker from './FilenameMaker.mjs';
import makeHashTable from './MakeHashTable.mjs';
import { insertCSS, extractCSS } from './CSS.mjs';
import {
  getFootnoteDefIds,
  keepReferredFootnotes$,
  updateFootnotes
} from './Footnotes.mjs';

const fsp = fs.promises;

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
export const getContentNode$ = (node) => D.find$('#content')(node);

/**
 * Returns the first id of the given page.
 *
 * @param {Cheerio} contentNode The Cheerio instance that
 *  context is pointint `#content`.
 */
export const getFirstContentId = (contentNode) =>
  contentNode.children().first().attr('id') ||
  contentNode.children().first().children().first().attr('id');

/**
 * This function creates a new container with contents
 * appended at #content element.  The contents is also cloned
 * internally before appended.
 *
 * @param {Function} referredFootnotesKeeper$ the curried functon of
 *  keepReferredFootnotes$(footnoteDefIds:: Map<string>).
 * @param {Map<id, filename>} hashtable The hashtable of
 *  (key, value) = (id, filename), plus the
 *  ('navigation', {filename, pageNum})
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
export const makeDocument = (referredFootnotesKeeper$, hashtable) =>
  (config, basename, container, ...contents) => {
    const linkRewriter = updateLinks(hashtable);
    const nodes = contents.map(linkRewriter);
    const newContainer = D.clone(container);
    return pipe(
      getContentNode$,
      D.append$(...nodes), // dom.append$() clones contents
      updateFootnotes(referredFootnotesKeeper$(newContainer.find('#footnotes'))),
      addPageNavigation(basename, hashtable.get('navigation')),
      setCurrentToToc(basename),
      insertScript,
    )(newContainer);
  };

const basenameMaker = getFilenameMaker();

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
 * @deprecated
 * Creates new DOM with empty content.
 *
 * @param {Cheerio} $ The instance of Cheerio.
 * @param {boolean} isStictMode true if extraction mode
 *  is in strict mode.  In strict mode, asciidoctor-chunker
 *  assumes there are only defult contents under div#content.
 *  If the mode is not strict, makeContainer() leaves unknown
 *  contents under div#content untouched.
 *  The default is false or undefined.
 *
 */
export const makeContainer = (config) => ($) => {
  const { strictMode } = config;
  const root = $.root().clone().find('#content > #preamble, #content > .partintro, #content > .sect1, #content > .sect0').remove().end();
  const content = root.find('#content');
  if (strictMode) { // in strict mode
    if (content.children().length > 0)
      showStrictModeMessage(content);
    return content.empty().end();
  }
  return root;
}

/** @deprecated */
const showStrictModeMessage = (contentNode) => {
  const getNodeInfo = node => `tag=${node[0].name} id=${node.attr('id')}, class=${node.attr('class')}`;

  console.log(`INFO: Non-Asciidoc contents encountered under <div id='#content'>.
INFO: They are ignored and not included in chunked html by default.
INFO: If you want them to be included, use the '--no-strictMode' command option.`);
  contentNode.html().trim().split(/\n+/).forEach(line => console.log(`INFO: Found content => ${line}`));
  console.log();
};

export const printer = outDir => (fnamePrefix, dom) => {
  const fname = path.format({
    dir: outDir,
    base: `${fnamePrefix}.html`
  });
  fsp.writeFile(fname, dom.html()).catch(err =>
    console.log("File write error:", fname));
}

/**
 * Make chunked html.  This is the main function to extract
 * whole book of adoc html file.
 * This function does not return anything.  This takes
 * a printer function for side effect.
 *
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer
 *  The callback which takes the filename prefix (the base name of
 *  the html file) and Cheerio instance mainly to print or write out
 *  to files.
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
  const ht = makeHashTable($, config); // Map<id, filename>
  const linkRewriter = updateLinks(ht);
  const container = pipe(
    makeContainer(config),
    checkTocLinks,
    linkRewriter,
    extractCSS(config.outdir),
    insertCSS(config),
    addTitlepageToc$(config),
  )($)
  // addTitlepageToc$(container); // add titlepage link in the toc
  const footnotesKeeper$ =
    keepReferredFootnotes$(getFootnoteDefIds($('#footnotes')));
  // delegates recursive processing to processContents()
  // by passing three processors to handle each contents.
  processContents(
    getPreambleExtractor(printer, container,
      makeDocument(footnotesKeeper$, ht)),
    getPartExtractor(printer, container,
      makeDocument(footnotesKeeper$, ht)),
    getChapterExtractor(printer, container, basenameMaker,
      makeDocument(footnotesKeeper$, ht)),
    $,
    config,
    basenameMaker);
}

/**
 * @param {Map<id, url>} ht the Hashtable of <id, url>.  If id is 'foo' then
 *  url is 'filename.html#foo' where the filename is where the id is defined.
 */
const updateLinks = (ht) => (node) => {
  node.find('a[href^=#]').each((i, ele) => {
    const a = new Cheerio(ele);
    const url = a.attr('href');
    // footnote is always whithin the chunked page so no need to rewrite
    if (!url.startsWith('#_footnotedef_') &&
      !url.startsWith('#_footnoteref_')) {
      const id = url.substring(1);
      const newURL = ht.get(id);
      if (newURL) {
        a.attr('href', newURL);
      } else { // when target URL is missing (undefined)
        const newClass = a.attr('class') ?
          `${a.attr('class')} target-missing` : 'target-missing';
        a.attr('href', `#${id}`);
        a.attr('class', newClass);
      }
    }
  });
  return node;
}

export const addPageNavigation = (basename, { filename2pageNum, filenameList }) =>
  (rootNode) => {
    const thisPageNum = filename2pageNum[`${basename}.html`];
    const prev = thisPageNum > 0 ? filenameList[thisPageNum - 1] : null;
    const next = thisPageNum < filenameList.length - 1 ? filenameList[thisPageNum + 1] : null;
    const html = createNav(prev, next);
    const div = rootNode.find('body > div:last-of-type');
    if (div.attr('id') === 'footer')
      new Cheerio(html).insertBefore(div);
    else
      new Cheerio(html).insertAfter(div);

    return rootNode;
  };

const createNav = (prev, next) => `
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

const insertScript = (rootNode) => {
  rootNode.find('html').append(`
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
