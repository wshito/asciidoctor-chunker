/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import getFilenameMaker from '../src/FilenameMaker.mjs';
import Node from '../src/Node.mjs';
import { makeChunks, _makeContainer } from '../src/Page.mjs';

const SAMPLE = Node.getInstanceFromFile('test/resources/output/single/sample.html');
/**
 * The basename of default FilenameMaker
 */
const DEFAULT_BASENAMES = { // part-chap-sec-subsec-subsubsec-
  'chap1': ['chap1', 'chap1_sec1', 'chap1_sec2', 'chap1_sec3'], // 1st chapter structure
  // chap 2, depth 1
  'chap2:depth1': ['chap2'],
  // chap 2, depth 2
  'chap2:depth2': ['chap2',
    'chap2_sec1',
    'chap2_sec2',
    'chap2_sec3'
  ],
  // chap 2, depth 3
  'chap2:depth3': ['chap2',
    'chap2_sec1',
    'chap2_sec2',
    'chap2_sec2-1',
    'chap2_sec2-2',
    'chap2_sec2-3',
    'chap2_sec3'
  ],
  // chap 2, depth 4
  'chap2:depth4': ['chap2',
    'chap2_sec1',
    'chap2_sec2',
    'chap2_sec2-1',
    'chap2_sec2-1-1', 'chap2_sec2-1-2',
    'chap2_sec2-2',
    'chap2_sec2-2-1', 'chap2_sec2-2-2', 'chap2_sec2-2-3',
    'chap2_sec2-3',
    'chap2_sec3'
  ],
  // chap 3, depth 2
  'chap3:depth2': ['chap3',
    'chap3_sec1',
    'chap3_sec2',
    'chap3_sec3',
  ],
};

test('test makeChunks() depth 1 (chapters)', t => {
  const root = SAMPLE.clone();
  const res = [];
  // not definining outDir makes CSS extractor to skip writing files
  const config = {
    depth: { default: 1 },
    titlePage: 'Titlepage',
    strictMode: true
  };
  makeChunks(_printer4test(res), root, config, getFilenameMaker());
  const filenames = ['index', 'part1', 'chap1', 'chap2', 'part2', 'chap3'];
  t.is(res.length, filenames.length,
    'check the number of extracted pages');

  for (let i = 0; i < res.length; i++) {
    const { basename, html } = res[i];
    t.is(basename, filenames[i], 'test the extracted filenames');
    _runTest(i, basename, html);
  }

  // tests if the current page is properly marked in the toc
  // this is used in _runTest()
  function _testToc (rootNode, basename, title) {
    const a = rootNode.find('#toc li.current a').first();
    t.is(a.getAttr('href'), `${basename}.html`);
    t.is(a.html(), title);

  }
  // custom tests on each page
  function _runTest (index, basename, html) {
    const tests = [
      // preamble page
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Titlepage');
        t.is(root.find('#_footnoteref_3').length, 1);
        t.is(root.find('#_footnotedef_3').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // part I
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Part I');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap 1
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '1. First Chapter');
        t.is(root.find('#_footnoteref_4').length, 1);
        t.is(root.find('#_footnotedef_4').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // chap 2
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2. Second Chapter');
        t.is(root.find('#_footnoteref_1').length, 1);
        t.is(root.find('#_footnotedef_1').length, 1);
        t.is(root.find('#_footnoteref_4').length, 1);
        t.is(root.find('#_footnotedef_4').length, 1);
        t.is(root.find('a.footnote').length, 3); // multiply referred in Sec 2-1-2
        t.is(root.find('div.footnote').length, 2);
      },
      // part II
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Part II');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap 3
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '3. Third Chapter<sup class="footnote">[2]</sup>');
        t.is(root.find('#_footnoteref_2').length, 1);
        t.is(root.find('#_footnotedef_2').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
    ];
    if (tests[index])
      tests[index](basename, html);
  }
});

test('test makeChunks() fine-tuned extraction with titlePage option', t => {
  const root = SAMPLE.clone();
  const res = [];
  // not definining outDir makes CSS extractor to skip writing files
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    },
    titlePage: 'Welcome', // test titlePage option
    strictMode: true,
  };
  makeChunks(_printer4test(res), root, config, getFilenameMaker());
  const filenames = ['index', 'part1', 'chap1',
    ...DEFAULT_BASENAMES['chap2:depth4'],
    'part2',
    ...DEFAULT_BASENAMES['chap3:depth2']
  ];
  t.is(res.length, filenames.length,
    'check the number of extracted pages');

  for (let i = 0; i < res.length; i++) {
    const { basename, html } = res[i];
    t.is(basename, filenames[i], 'test the extracted filenames');
    _runTest(i, basename, html);
  }

  // tests if the current page is properly marked in the toc
  // this is used in _runTest()
  function _testToc (rootNode, basename, title) {
    const a = rootNode.find('#toc li.current a');
    t.is(a.getAttr('href'), `${basename}.html`);
    t.is(a.html(), title);
  }
  // custom tests on each page
  function _runTest (index, basename, html) {
    const tests = [
      // preamble page
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // tests titlePage option
        _testToc(root, basename, 'Welcome');
        t.is(root.find('#_footnoteref_3').length, 1);
        t.is(root.find('#_footnotedef_3').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // part I
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Part I');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap 1
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '1. First Chapter');
        t.is(root.find('#_footnoteref_4').length, 1);
        t.is(root.find('#_footnotedef_4').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // chap 2
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2. Second Chapter');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec1
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.1. Chap2. First Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2 (depth:2)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.2. Chap2. Second Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-1 (depth:3)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.2.1. Chap2. Sec 2-1');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-1-1  (depth:4)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Chap2. Sec 2-1-1');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-1-2  (depth:4)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Chap2. Sec 2-1-2');
        t.is(root.find('#_footnoteref_4').length, 1);
        t.is(root.find('#_footnotedef_4').length, 1);
        t.is(root.find('a.footnote').length, 2); // multiply referred in Sec 2-1-2
        t.is(root.find('div.footnote').length, 1);
      },
      // chap2 sec2-2 (depth:3)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.2.2. Chap2. Sec 2-2');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-2-1  (depth:4)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Chap2. Sec 2-2-1');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-2-2  (depth:4)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Chap2. Sec 2-2-2');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec2-2-3  (depth:4)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Chap2. Sec 2-2-3<sup class="footnote">[1]</sup>');
        t.is(root.find('#_footnoteref_1').length, 1);
        t.is(root.find('#_footnotedef_1').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // chap2 sec2-3 (depth:3)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.2.3. Chap2. Sec 2-3');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap2 sec3 (depth:2)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '2.3. Chap2. Third Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // part II
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, 'Part II');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap 3 (depth:1)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '3. Third Chapter<sup class="footnote">[2]</sup>');
        t.is(root.find('#_footnoteref_2').length, 1);
        t.is(root.find('#_footnotedef_2').length, 1);
        t.is(root.find('a.footnote').length, 1);
        t.is(root.find('div.footnote').length, 1);
      },
      // chap3 sec1 (depth:2)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '3.1. Chap3. First Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap3 sec2 (depth:2)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '3.2. Chap3. Second Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
      // chap3 sec3 (depth:2)
      (basename, html) => {
        const root = Node.getInstanceFromHTML(html);
        // check toc
        _testToc(root, basename, '3.3. Chap3. Third Section');
        t.is(root.find('a.footnote').length, 0);
        t.is(root.find('div.footnote').length, 0);
      },
    ];
    if (tests[index])
      tests[index](basename, html);
  }
});

test('_makeContainer() non-strict mode', t => {
  const orig = SAMPLE.clone();
  const container = _makeContainer({ strictModel: false })(orig);
  t.is(0, container.find('#content').children().length); // should be empty
  t.is(1, container.find('head').length);

  t.true(orig.find('#content').children().length > 0); // original DOM is untouched
  // console.log(orig.html());
});

test('_makeContainer() strict mode', t => {
  const orig = SAMPLE.clone();
  // insert span at the beginning of the div#content
  const first = orig.find('#content').children().first();
  Node.insertHtmlBefore('<span>INSERTED</span>', first);
  t.is(orig.find('#content').children().first().text(), 'INSERTED');

  const container = _makeContainer({ strictMode: false })(orig);
  // leaves <span>  since non-strict mode
  t.is(1, container.find('#content').children().length);
  t.true(orig.find('#content').children().length > 1); // original DOM is untouched

  const containerStrict = _makeContainer({ strictMode: true })(orig);
  // strict mode empties all the children
  t.is(0, containerStrict.find('#content').children().length);
  t.true(orig.find('#content').children().length > 0); // original DOM is untouched
});

// TODO currently unused.  this is to test for ID based filenames
const _getFirstContentID = (rootNode) => rootNode.find('#content [id]').first().getAttr('id');

/**
 * Keeps the result of content processing in results.
 * @param {[{basename: String, html: String}]} results the array
 *  of objects which has fileds of basename and HTML output.
 * @param {string} basename the basename of chunked output file
 * @param {Node} node the root node of the chunked page
 */
const _printer4test = (results) => (basename, node) => {
  // console.log(node.html());
  results.push({ basename, html: node.html() });
};
