/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';
import {
  getFootnoteDefIds,
  _findFootnoteReferers,
  _makeFootnoteRefId,
  _updateRefererId$
} from '../src/Footnotes.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';

/**
 * Use clone of this sample in the test to minimize the disk access
 */
const SAMPLE = Node.getInstanceFromFile(sampleHTML);

test('getFootnoteDefIds()', t => {
  const root = SAMPLE.clone();
  const ids = getFootnoteDefIds(root.find('#footnotes'));
  t.is(ids.size, 4);
  [1, 2, 3, 4].map((val) => {
    t.true(ids.has(`_footnotedef_${val}`));
  });
  t.is(root.find('#content').children().first().getAttr('id'),
    'preamble',
    'test if find() works on rootNode after invoking getFootnoteDefIds');
});

test('_findFootnoteReferers()', t => {
  const rootNode = SAMPLE.clone();
  const contentNode = rootNode.find('#content');
  const referers = _findFootnoteReferers(contentNode);
  t.is(6, referers.length, 'sample.doc has 6 referers');
  referers.each((ele, i) => {
    t.true(ele.getAttr('href').startsWith('#_footnotedef_'));
  });
  t.is(rootNode.find('#content').children().first().getAttr('id'),
    'preamble',
    'test if find() works on rootNode after invoking getFootnoteDefIds');
});

test('_makeFootnoteRefId()', t => {
  t.is(_makeFootnoteRefId('_footnotedef_15'), '_footnoteref_15');
});

test('_updateRefererId$()', t => {
  // total 6 referers
  // 3 referers for footnote4 in the entire page
  // 2 referers for footnote4 in chapter 2
  const root = SAMPLE.clone();

  // test with all 6 referers
  const all = root.find('a.footnote');
  t.is(all.length, 6);
  _updateRefererId$(all); // modifies the id attribute
  let cnt = 0;
  all.each((e, i) => {
    if (e.getAttr('id')) {
      cnt++;
      t.true(e.getAttr('id').startsWith('_footnoteref_'));
    }
  });
  // only 4 distinct footnotes should have referer id
  t.is(cnt, 4);

  // test with 2 referers for footnote4 in chunked page of Ch2
  const ref4 = SAMPLE.clone().find('h2#_second_chapter + div.sectionbody a.footnote[href="#_footnotedef_4"]');
  t.is(ref4.length, 2);
  // both of them should not have ids
  ref4.each((e, i) => {
    t.true(e.getAttr('id') === undefined);
  });
  // pass these two referers.  the first one should be added id
  // to be linked back from the footnote
  _updateRefererId$(ref4);
  ref4.each((e, i) => {
    if (i === 0) {
      t.is(e.getAttr('id'), '_footnoteref_4');
    } else if (i === 1) {
      t.is(e.getAttr('id'), undefined);
    } else
      t.throws();
  });
});
