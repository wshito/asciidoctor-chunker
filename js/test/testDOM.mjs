/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import fs from 'fs';
import test from 'ava';
import {
  newDOM,
  extract,
  makeContainer,
  extractPreamble,
} from '../src/DOM.mjs';
import cheerio from 'cheerio';
import { extractPart } from '../src/DOM.mjs';

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
  ]
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
    }
  };
  const $ = newDOM(sampleHTML);
  const container = makeContainer($);

  /* Test is done inside the printer() function */
  // for Chapter 1
  let chap = 1;
  console.log("Chapter 1");
  console.log("1st round");
  extract(printer('chap1'), 1, container, $('div.sect1').first(), 1, 'chap', chap);
  console.log("2nd round");
  extract(printer('chap1'), 2, container, $('div.sect1').first(), 1, 'chap', chap);
  console.log("3rd round");
  extract(printer('chap1'), 3, container, $('div.sect1').first(), 1, 'chap', chap);
  // for Chapter 2
  console.log("Chapter 2");
  chap = 2;
  console.log("1st round");
  // get() returns a Node so wrap with Cheerio object
  extract(printer('chap2:depth1'), 1, container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("2nd round");
  extract(printer('chap2:depth2'), 2, container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("3rd round");
  extract(printer('chap2:depth3'), 3, container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);
  console.log("4th round");
  extract(printer('chap2:depth4'), 6, container, cheerio($('div.sect1').get(1)), 1, 'chap', chap);

  t.pass();
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

    extractPreamble(printer, container, node);
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

    extractPart(printer, container, node, ++partNum);
  });
});
