/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';
import {
  addTitlepageToc$,
  setCurrentToToc
} from '../src/TOC.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';

/**
 * Use clone of this sample in the test to minimize the disk access
 */
const SAMPLE = Node.getInstanceFromFile(sampleHTML);

test('tests addTitlepageToc$()', t => {
  const root = SAMPLE.clone();
  t.is(root.find('div#toc > ul > li').length, 2);

  const li = root.find('div#toc > ul > li:first-child');
  const before = li.children().first();
  t.is(before.text(), 'Part I');

  addTitlepageToc$({ titlePage: 'Front page' })(root);
  t.is(root.find('div#toc > ul > li').length, 3);

  const after = root.find('div#toc > ul > li:first-child')
    .children().first();
  t.is(after.text(), 'Front page');
});

test('tests setCurrentToToc()', t => {
  const root = SAMPLE.clone();
  // set chap2 sec2-1 toc item's URL as `chap2.html`
  const a = root.find('div#toc ul.sectlevel3 > li > a[href="#_chap2_sec_2_1"]');
  a.setAttr$('href', 'chap2.html');
  // mark the parent of this anchor for testing
  a.parent().setAttr$('id', '_testing_');
  // no class attr at the moment
  t.is(a.getAttr('class'), undefined);

  // see if `
  //  <li class="current" id="testing">
  //    <a href="chap2.html" class="current">
  //  </li>`
  setCurrentToToc('chap2')(root);
  const after = root.find('div#toc #_testing_');
  t.is(after.getAttr('class'), 'current');
});
