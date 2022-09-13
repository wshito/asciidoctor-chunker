/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';

test('test non-exisitent target link', t => {
  // Even if the target of the cross reference does not exist
  // the link with the anchor must be properly set.
  const $single = Node.getInstanceFromFile('test/resources/output/single/sample.html', null, true);
  const $chunked = Node.getInstanceFromFile('test/resources/output/html_chunks/chap3_sec3.html', null, true);
  const selector = '#_chap3_third_section + div.paragraph p a';
  const hrefSingle = $single.find(selector);
  const hrefChunked = $chunked.find(selector);
  // test href attribute
  t.is(hrefSingle.getAttr('href'), hrefChunked.getAttr('href'));
  t.is('#chap4', hrefChunked.getAttr('href'));
  // test the link text
  t.is(hrefSingle.text(), hrefChunked.text());
  t.is('Chapter 4', hrefChunked.text());
  // test target-missing class is added to the chunked html
  t.is('target-missing', hrefChunked.getAttr('class'));
});

test('legal cross reference', t => {
  const $single = Node.getInstanceFromFile('test/resources/output/single/sample.html', null, true);
  const $chunked = Node.getInstanceFromFile('test/resources/output/html_chunks/chap2_sec3.html', null, true);
  const selector = '#_chap2_third_section + div.paragraph + div.paragraph p a';
  const hrefSingle = $single.find(selector);
  const hrefChunked = $chunked.find(selector);
  // test href attribute
  t.is('#chap3', hrefSingle.getAttr('href'));
  t.is('chap3.html', hrefChunked.getAttr('href'));
  // test the link text
  t.is(hrefSingle.text(), hrefChunked.text());
  t.is('Chapter 3', hrefChunked.text());
});
