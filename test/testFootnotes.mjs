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
  _makeFootnoteRefId
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
