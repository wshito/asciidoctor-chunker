/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';
import { _makeContainer } from '../src/Page.mjs';

const sample = Node.getInstanceFromFile('test/resources/output/single/sample.html');

test('_makeContainer() non-strict mode', t => {
  const orig = sample.clone();
  const container = _makeContainer({ strictModel: false })(orig);
  t.is(0, container.find('#content').children().length); // should be empty
  t.is(1, container.find('head').length);

  t.true(orig.find('#content').children().length > 0); // original DOM is untouched

});

test('_makeContainer() strict mode', t => {
  const orig = sample.clone();
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
