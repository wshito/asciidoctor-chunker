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
} from '../src/DOM.mjs';
import cheerio from 'cheerio';
import jquery from 'jquery';
import { JSDOM } from 'jsdom';


const sampleHTML = 'test/resources/output/single/sample.html';
const sampleHTMLstructure = { // part-chap-sec-subsec-subsubsec-
  'chap1': ['0-1', '0-1-1', '0-1-2', '0-1-3'], // 1st chapter structure
  // chap 2, depth 1
  'chap2:depth1': ['0-2'],
  // chap 2, depth 2
  'chap2:depth2': ['0-2',
    '0-2-1',
    '0-2-2',
    '0-2-3'
  ],
  // chap 2, depth 3
  'chap2:depth3': ['0-2',
    '0-2-1',
    '0-2-2',
    '0-2-2-1',
    '0-2-2-2',
    '0-2-2-3',
    '0-2-3'
  ],
  // chap 2, depth 4
  'chap2:depth4': ['0-2',
    '0-2-1',
    '0-2-2',
    '0-2-2-1',
    '0-2-2-1-1', '0-2-2-1-2',
    '0-2-2-2',
    '0-2-2-2-1', '0-2-2-2-2', '0-2-2-2-3',
    '0-2-2-3',
    '0-2-3'
  ]
};
const sectClass = seclabel => `sect${seclabel.split('-').length - 1}`;

const makeContainer = $ => $('#content').empty();


test('test DOM created by cheerio', t => {
  const cheerioHTML = newDOM(sampleHTML).html();
  t.truthy(cheerioHTML);
});

test('extract sections', t => {
  /** definition of printer functon */
  const printer = chap => {
    let counter = 0; // closure
    return (fnamePrefix, html) => {
      const actual = `${fnamePrefix}: ${html.split('\n')[0]}`;
      const label = sampleHTMLstructure[chap][counter++];
      const expected = `${label}: <div class="${sectClass(label)}">`;
      console.log(actual);
      t.is(actual, expected);
    }
  };
  const selectFirst = jquery => selector => {
    jquery(selector).first();
    return jquery;
  };
  const empty = jquery => selector => {
    // end() will go back to the parent element selected
    return jquery.root().clone().find(selector).empty().end();
  }
  const $ = newDOM(sampleHTML);
  const container = empty($)('#content');

  /* Test is done inside the printer() function */
  // for Chapter 1
  let chap = 1;
  console.log("Chapter 1");
  console.log("1st round");
  extract(printer('chap1'), 1, container, $('div.sect1').first(), 1, '0', chap);
  console.log("2nd round");
  extract(printer('chap1'), 2, container, $('div.sect1').first(), 1, '0', chap);
  console.log("3rd round");
  extract(printer('chap1'), 3, container, $('div.sect1').first(), 1, '0', chap);
  // for Chapter 2
  console.log("Chapter 2");
  chap = 2;
  console.log("1st round");
  // get() returns a Node so wrap with Cheerio object
  extract(printer('chap2:depth1'), 1, container, cheerio($('div.sect1').get(1)), 1, '0', chap);
  console.log("2nd round");
  extract(printer('chap2:depth2'), 2, container, cheerio($('div.sect1').get(1)), 1, '0', chap);
  console.log("3rd round");
  extract(printer('chap2:depth3'), 3, container, cheerio($('div.sect1').get(1)), 1, '0', chap);
  console.log("4th round");
  extract(printer('chap2:depth4'), 6, container, cheerio($('div.sect1').get(1)), 1, '0', chap);

  t.pass();
});
