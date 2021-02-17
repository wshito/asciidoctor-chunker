/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import fs from 'fs';
import test from 'ava';
import {
  newDOM,
  extractChapters,
  makeContainer,
  extractPreamble,
  extractPart,
  makeChunks,
  makeHashTable,
  makeDocument,
  getFirstContentId,
  getContentNode$,
  getFootnoteDefIds,
  findFootnoteReferers,
  keepReferredFootnotes$,
  updateRefererId$,
  makeFootnoteRefId,
  updateFootnotes,
} from '../src/DOM.mjs';
import { append$ } from '../src/DomFunc.mjs';
import { pipe } from '../src/Utils.mjs';
import cheerio from 'cheerio';

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

test('test DOM created by cheerio', t => {
  const cheerioHTML = newDOM(sampleHTML).html();
  t.truthy(cheerioHTML);
});

test('extract sections', t => {
  /** definition of printer functon */
  const printer = chap => {
    let counter = 0; // closure
    return (fnamePrefix, dom) => {
      /* For DEBUG
      if (fnamePrefix === 'chap2_sec2-2-3')
        console.log(dom.find('body').html());
      */
      const html = dom.find('#content').html();
      // console.log(html);
      const actual = `${fnamePrefix}: ${html.split('\n')[0]}`;
      const label = sampleHTMLstructure[chap][counter++];
      const expected = `${label}: <div class="${sectClass(label)}">`;
      console.log(actual);
      t.is(actual, expected);
    };
  };
  const $ = newDOM(sampleHTML);
  const container = makeContainer($);
  const makeDefaultDepth = (num) => ({ depth: { default: num } });

  // we don't have to rewrite the links in the
  // extraction test so pass the empty hashtabel
  // to makeDocument()
  const dm = makeDocument(referredFootnotesKeeperDymmy, new Map());
  /* Test is done inside the printer() function */
  // for Chapter 1
  let chap = 1;
  console.log("Chapter 1");
  console.log("1st round");
  extractChapters(printer('chap1'), container, dm)(makeDefaultDepth(1), container, $('div.sect1').first(), 1, 'chap', chap);
  console.log("2nd round");
  extractChapters(printer('chap1'), container, dm)(makeDefaultDepth(2), container, $('div.sect1').first(), 1, 'chap', chap);
  console.log("3rd round");
  extractChapters(printer('chap1'), container, dm)(makeDefaultDepth(3), container, $('div.sect1').first(), 1, 'chap', chap);
  // for Chapter 2
  console.log("Chapter 2");
  chap = 2;
  console.log("1st round");
  // get() returns a Node so wrap with Cheerio object
  extractChapters(printer('chap2:depth1'), container, dm)(makeDefaultDepth(1), container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("2nd round");
  extractChapters(printer('chap2:depth2'), container, dm)(makeDefaultDepth(2), container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("3rd round");
  extractChapters(printer('chap2:depth3'), container, dm)(makeDefaultDepth(3), container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("4th round");
  extractChapters(printer('chap2:depth4'), container, dm)(makeDefaultDepth(6), container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);

  t.pass();
});

test('fine tuned extrations', t => {
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    }
  };
  const results = { part: [], chap: [] };
  const printer = (res) => (fnamePrefix, dom) => {
    let div = fnamePrefix.startsWith('part') ?
      dom.find('#content > h1') : dom.find('#content > div');
    const id = div.children().first().attr('id') ||
      div.attr('id');
    if (fnamePrefix.startsWith('chap'))
      results.chap.push({ filename: fnamePrefix, id });
    else
      results.part.push({ filename: fnamePrefix, id });
    // console.log("Here", fnamePrefix);
  };

  makeChunks(printer(results), newDOM(sampleHTML), config);

  // test preamble and part extraction
  t.is(results.part.length, 3);
  t.deepEqual(results.part[0], { filename: 'index', id: 'preamble' });
  t.deepEqual(results.part[1], { filename: 'part1', id: '_part_i' });
  t.deepEqual(results.part[2], { filename: 'part2', id: '_part_ii' });
  // test chapter extraction
  t.is(results.chap.length,
    1 + sampleHTMLstructure['chap2:depth4'].length +
    sampleHTMLstructure['chap3:depth2'].length);
  // make list of expected filenames
  const filenames = ['chap1'].concat(sampleHTMLstructure['chap2:depth4']).concat(sampleHTMLstructure['chap3:depth2']);
  // check actual filenames obtained
  t.deepEqual(results.chap.map(ele => ele.filename),
    filenames);
  // check actual ids obtained
  t.is(results.chap[5].id, '_chap2_sec_2_1_1');
});

test('preamble extraction', t => {
  const $ = newDOM(sampleHTML);
  const container = makeContainer($);

  const printer = (fnamePrefix, dom) => {
    // console.log(dom.find('body').html());
    t.is(dom.find('div#preamble').siblings().length, 0);
    t.true(dom.find('div#preamble').children().first().hasClass('sectionbody'));
  }

  $('#content').children().each((i, ele) => {
    if (i !== 0)
      return;
    const node = cheerio(ele);
    t.is(node.attr('id'), 'preamble');
    // we don't have to rewrite the links in the
    // extraction test so pass the empty hashtabel
    // to makeDocument()
    extractPreamble(printer, container, makeDocument(referredFootnotesKeeperDymmy, new Map()))($.root(), node);
  });
});

test('Part extraction', t => {
  const $ = newDOM(sampleHTML);
  const container = makeContainer($);
  let partNum = 0;
  $('#content').children().each((i, ele) => {
    const node = cheerio(ele);
    if (node.hasClass('partintro'))
      return; // ignore
    if (node.hasClass('sect1'))
      return; // process chapters here
    if (!node.hasClass('sect0'))
      return;

    // node is h1.sect0

    const printer = (fnamePrefix, dom) => {
      /* DEBUG
      console.log('Part', fnamePrefix);
      if (fnamePrefix === '1') console.log(dom.find('body').html());
      */
      t.true(dom.find('#content').children().first().hasClass('sect0'));
      t.true(cheerio(dom.find('#content').children().get(1)).hasClass('partintro'));
    }
    // we don't have to rewrite the links in the
    // extraction test so pass the empty hashtabel
    // to makeDocument()
    extractPart(printer, container,
      makeDocument(referredFootnotesKeeperDymmy, new Map()))($.root(), node, ++partNum);
  });
});

test('No hash to the link of first element in each page', t => {
  const $ = newDOM(sampleHTML);
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    }
  };
  const printer = (fnamePrefix, dom) => {
    const hash = `#${pipe(
      getContentNode$,
      getFirstContentId
    )(dom)}`;
    let noHash = true;
    dom.find('a').each((i, ele) => {
      // console.log(cheerio(ele).attr('href'));
      noHash = noHash && !cheerio(ele).attr('href').endsWith(hash);
      return noHash; // if false, each() will exit loop early
    });
    t.true(noHash);
  };
  makeChunks(printer, $, config); // test is inside the printer()
});

test('getFootnoteDefIds()', t => {
  const $ = newDOM(sampleHTML);
  const rootNode = $.root();
  const ids = getFootnoteDefIds(rootNode.find('#footnotes'));
  t.is(ids.size, 4);
  [1, 2, 3, 4].map((val) => {
    t.true(ids.has(`_footnotedef_${val}`));
  });
  t.is(rootNode.find('#content').children().first().attr('id'),
    'preamble',
    'test if find() works on rootNode after invoking getFootnoteDefIds');
});

test('findFootnoteReferers()', t => {
  const $ = newDOM(sampleHTML);
  const rootNode = $.root();
  const referers = findFootnoteReferers(getContentNode$(rootNode));
  t.is(6, referers.length, 'sample.doc has 6 referers');
  referers.each((i, ele) => {
    t.true(cheerio(ele).attr('href').startsWith('#_footnotedef_'));
  });
  t.is(rootNode.find('#content').children().first().attr('id'),
    'preamble',
    'test if find() works on rootNode after invoking getFootnoteDefIds');
});

test('keepReferredFootnotes$()()()', t => {
  const $ = newDOM(sampleHTML);
  const ids = getFootnoteDefIds($('#footnotes'));
  const keepFootnotesFn$ = keepReferredFootnotes$(ids);
  // --------------------------------
  // extract referers anchors in Chap2. Sec 2-1-2
  // there are two referers and both pointing _footnotedef_4
  const doc1 = makeDoc($, '_chap2_sec_2_1_2');
  const referers1 = findFootnoteReferers(getContentNode$(doc1));
  // remove unreferred footnotes here. doc1 is modified
  keepFootnotesFn$(doc1.find('#footnotes'))(referers1);
  // now only _footnotedef_4 should be left in the page
  t.is(doc1.find('div.footnote').length, 1);
  // ---------------------------------
});

test('updateRefererId$()', t => {
  const $ = newDOM(sampleHTML);
  const ids = getFootnoteDefIds($('#footnotes'));
  const keepFootnotesFn$ = keepReferredFootnotes$(ids);
  // --------------------------------
  // extract referers anchors in Chap2. Sec 2-1-2
  // there are two referers and both pointing _footnotedef_4
  const doc1 = makeDoc($, '_chap2_sec_2_1_2');
  const referers1 = findFootnoteReferers(getContentNode$(doc1));
  updateRefererId$(referers1);
  t.is(referers1.length, 2);
  const first = referers1.first();
  t.is(first.attr('id'), '_footnoteref_4');
  t.is(first.attr('href'), '#_footnotedef_4');
  const second = cheerio(referers1.get(1));
  t.is(second.attr('id'), undefined);
  t.is(second.attr('href'), '#_footnotedef_4');
});

test('makeFootnoteRefId()', t => {
  t.is(makeFootnoteRefId('_footnotedef_15'), '_footnoteref_15');
});

test('updateFootnotes()()', t => {
  const $ = newDOM(sampleHTML);
  const ids = getFootnoteDefIds($('#footnotes'));
  const doc = makeDoc($, '_chap2_sec_2_1_2');
  const footnotesKeeper$ = keepReferredFootnotes$(ids)(doc.find('#footnotes'));
  updateFootnotes(footnotesKeeper$)(doc);
  // test if only referred footnotes are left
  const footnotes = doc.find('div.footnote');
  t.is(footnotes.length, 1);
  t.is(footnotes.attr('id'), '_footnotedef_4');
  // test if there are only two anchors
  // with only the first one having id attribute.
  const refs = doc.find('a.footnote');
  t.is(refs.length, 2);
  const first = refs.first();
  t.is(first.attr('id'), '_footnoteref_4');
  t.is(first.attr('href'), '#_footnotedef_4');
  const second = cheerio(refs.get(1));
  t.is(second.attr('id'), undefined);
  t.is(second.attr('href'), '#_footnotedef_4');
  /*
  console.log(doc.find('#content').html());
  console.log('-----------');
  console.log(doc.find('#footnotes').html());
  */
});

test('makeChunks()', t => {
  const $ = newDOM(sampleHTML);
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    }
  };
  const preambleDescription = {
    footnotes: ['_footnotedef_3'],
    footnoteRefsTotal: 1
  }
  const printer = (fnamePrefix, dom) => {
    if (fnamePrefix === 'index') {
      // preamble
      testChunk(preambleDescription, dom, t);
    }
    // console.log(fnamePrefix);
  };

  makeChunks(printer, $, config);
});

// extracts div.sectNUM for the section ID
function extract ($, secID) {
  return $(`#${secID}`).parent().clone();
}
// manually make a page with secID extracted
function makeDoc ($, secID) {
  const container = makeContainer($);
  const node = extract($, secID);
  const contentNode = getContentNode$(container);
  return append$(node)(contentNode);
};

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
    const node = cheerio(e);
    t.is(node.attr('id'), dsc.footnotes[i]);
  });
}
