/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import { getChapterExtractor } from '../src/Chapters.mjs';
import getFilenameMaker from '../src/FilenameMaker.mjs';
import Node from '../src/Node.mjs';
import { _makeContainer } from '../src/Page.mjs';

const SAMPLE = Node.getInstanceFromFile('test/resources/output/single/sample.html');
/*
  Asciidoctor single HTML layout under the div#content
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
 * Returns the document maker that builds a page by appending given
 * nodes into the container.  This is the simple document maker
 * implementation.  The actual document maker handls footnotes,
 * page navigaation, tocs and etc.
 *
 * @param {*} config 
 * @param {*} basename 
 * @param {Node} container The container DOM root node as a skelton.
 *  This DOM is not modified in this function.
 * @param  {Node} nodes The array of appending nodes under #content
 * @returns {Node} a new Node instance with new DOM with nodes appended.
 */
const _documentMaker = (config, basename, container, ...nodes) => {
  const newContainer = container.clone();
  const content = newContainer.find('#content');
  nodes.forEach((ele, i) => content.appendNode$(ele));
  return newContainer;
};
/**
 * Keeps the result of content processing in results.
 * @param {[{basename: String, node: Node}]} results the array of objects which
 *  has fileds of basename and node.
 */
const _printer4test = (results) => (basename, node) => {
  results.push({ basename, node });
};

/**
 * Mock for ContentProcessor that processes only chapters.
 * @param {*} config 
 * @param {*} root 
 * @param {*} chapterProcessor 
 * @param {*} basenameMaker 
 */
const _processContents = (config, root, chapterProcessor, basenameMaker) => {
  let chap = 0;
  let part = 0;
  let firstPageProcessed = false;
  let isFirstPage = false;
  root.find('#content').children().each((ele, i) => {
    if (ele.hasClass('partintro')) {
      // console.log("Part Intro");
      return; // ignore. this is taken care by part extraction
    }
    if (ele.hasClass('sect1')) {
      if (!firstPageProcessed && !isFirstPage) {
        isFirstPage = true;
        firstPageProcessed = true;
      } else
        isFirstPage = false;
      return chapterProcessor(config, root, ele, 1, 'chap',
        basenameMaker, ++chap, isFirstPage); // recursive extraction of chapters
    }
    if (ele.hasClass('sect0')) {
      if (!firstPageProcessed && !isFirstPage) {
        isFirstPage = true;
        firstPageProcessed = true;
      } else
        isFirstPage = false;
      // part extraction
    }
    if (ele.attr$('id') === 'preamble') {
      isFirstPage = true;
      firstPageProcessed = true;
      // process preamble
    }
  });
}

test('getChapterExtractor() and getChapterProcessor()', t => {
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    },
    strictMode: false
  };
  const orig = SAMPLE.clone();
  const container = _makeContainer(config)(orig);
  const res = []; // keeps results
  const chapExtractor = getChapterExtractor(_printer4test(res), container,
    _documentMaker);
  _processContents(config, orig, chapExtractor,
    getFilenameMaker()); // basenameMaker

  // should extract 17 chunks of chapter-sections
  t.is(17, res.length);

  const regExSectNum = /sect[1234]/;
  // test each extraction
  res.forEach(({ basename, node }) => {
    const cld = node.find('#content').children();
    t.is(1, cld.length); // each #content contains one chapter or section
    // the chap or sections should be sect1 -- sect4
    t.true(regExSectNum.test(cld.first().attr$('class')));
  });
});
