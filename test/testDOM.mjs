/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import getFilenameMaker from '../src/FilenameMaker.mjs';
import makeHashTable from '../src/MakeHashTable.mjs';
import {
  newDOM,
  makeContainer,
  makeChunks,
  makeDocument,
  getFirstContentId,
} from '../src/DOM.mjs';
import {
  getContentNode
} from '../src/Page.mjs';
import { pipe } from '../src/FP.mjs';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';
import { rm, exists, removeParameters } from '../src/Files.mjs';
import { mkdirs } from '../src/Files.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';
const sampleHTMLstructure = { // part-chap-sec-subsec-subsubsec-
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
const sectClass = seclabel => {
  const firstSplit = seclabel.split('_');
  const sectLevel = firstSplit.length === 1 ? 1 :
    seclabel.split('-').length + 1;
  return `sect${sectLevel}`;
}

/**
 * The function that handles making basename of the output file.
 */
const basenameMaker = getFilenameMaker();

test.skip('No hash to the link of first element in each page', async t => {
  const $ = newDOM(sampleHTML);
  const outdir = 'test/resources/tmp2';
  const config = {
    outdir,
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    }
  };
  const printer = (fnamePrefix, dom) => {
    const hash = `#${pipe(
      getContentNode,
      getFirstContentId
    )(dom)}`;
    let noHash = true;
    // none of the ahcnhors in the page
    // should have the url pointing to the
    // first content with hashed url since
    // it should be simply the page address.
    dom.find('a').each((i, ele) => {
      noHash = noHash && !new Cheerio(ele).attr('href').endsWith(hash);
      if (!noHash)
        console.log(new Cheerio(ele).attr('href'),
          "    has ", hash);

      return noHash; // if false, each() will exit loop early
    });
    t.true(noHash);
  };
  await mkdirs(outdir);
  // TODO
  makeChunks(printer, $, config, basenameMaker); // test is inside the printer()

  // cleanup for css file extraction side effects in makeChunks()
  await rm(outdir);
  t.false(await exists(outdir));
});

test.skip('removeParameters(url)', t => {

  t.is(removeParameters('chunked.js?4'), 'chunked.js');
  t.is(removeParameters('a/b/cde?fg/chunked.js?4'), 'a/b/cde?fg/chunked.js');
});

test.skip('test titlePage option', async t => {
  const $ = newDOM(sampleHTML);
  const outdir = 'test/resources/tmp4';
  const config = {
    outdir,
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    },
    titlePage: 'Welcome',
  };
  const printer = (fnamePrefix, dom) => {
    const hash = `#${pipe(
      getContentNode,
      getFirstContentId
    )(dom)}`;
    let hasWelcome = true;
    // Where an anchor points to index.html and
    // appears in a list, its text should match
    // our titlePage.
    dom.find('li a[href="index.html"]').each((i, ele) => {
      hasWelcome = hasWelcome && new Cheerio(ele).text() === 'Welcome';
      if (!hasWelcome)
        console.log(new Cheerio(ele).text(),
          " incorrect");

      return hasWelcome; // if false, each() will exit loop early
    });
    t.true(hasWelcome);
  };
  await mkdirs(outdir);
  // TODO
  makeChunks(printer, $, config, basenameMaker); // test is inside the printer()

  // cleanup for css file extraction side effects in makeChunks()
  await rm(outdir);
  t.false(await exists(outdir));
});

function referredFootnotesKeeperDymmy (_) {
  return (arg) => arg;
}

/**
 * Test case to test each chunked page.
 * This is called from the test for makeChunk().
 * The test is based on the page description
 * object.
 *
 * @param pageDescription
 * @param dom
 * @param t
 */
function testChunk (pageDescription, dom, t) {
  const dsc = pageDescription;
  const fnotes = dom.find('div.footnote');
  t.is(fnotes.length, dsc.footnotes.length);
  fnotes.each((i, e) => {
    const node = new Cheerio(e);
    t.is(node.attr('id'), dsc.footnotes[i]);
  });
}

/**
 * Creates one-level-curried makeDocument() function for
 * testing purpose.  The depth of extraction is configured
 * with the argument `depth`.  This setting is solely for
 * hash table cration to obtain the id-filename mapping
 * and page structure for page navigation.  If hashtable
 * is used only for the test, the depth should not
 * really matter.
 *
 * @param {number} depth
 */
// we don't have to rewrite the links in the
// extraction test so pass the empty hashtabel
// to makeDocument()
function createDocumentMaker ($) {
  return (depth) =>
    makeDocument(
      referredFootnotesKeeperDymmy,
      makeHashTable($.root(),
        makeConfigWithDepth(depth)));
}
