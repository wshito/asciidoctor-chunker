/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import * as cheerio from 'cheerio';

const html = `
  <html>
    <body>
     <h1>Hello World</h1>
     <div id="content">
       <p>ORIGINAL</p>
       <p class="num">1</p>
     </div>
    </body>
  </html>`;

test("tests Cheerio's each method", t => {
  const $ = cheerio.load(html, null, false);

  $.root().find('#content p').each((i, ele) => {
    if (i == 0) t.false($(ele).hasClass('num'));
    if (i == 1) t.true($(ele).hasClass('num')); // $(ele) works!
  });
  // Unlike the API document, $(this) does not work in each method
  $.root().find('#content p').each((i, ele) => {
    if (i == 0) t.false($(this).hasClass('num'));
    if (i == 1) t.false($(this).hasClass('num')); // $(this) does not work!
  });

});

test('tests append to the clone', t => {
  const $ = cheerio.load(html, null, false);
  const copy = $.root().clone();

  // use the original Cheerio $ instance
  // with passing the element from the cloned root element
  $(copy.find('#content')).append('<p class="new">appended</p>');

  //-- check the cloned document --

  // same as copy.find('#content p').
  // $(copy) sets the root context with copy and does not infulence the orignaly loaded root context
  const p = $(copy).find('#content p');
  t.is(p.length, 3);
  p.each((i, ele) => {
    if (i == 0) t.false($(ele).hasClass('num')); // $(this) does not work
    if (i == 1) t.true($(ele).hasClass('num'));
    if (i == 2) t.true($(ele).hasClass('new'));
  });

  //-- check the original document --

  // $().find() has no root context. Use $.root().find()
  // to use find() on default context
  const orig = $.root().find('#content p');
  t.is(orig.length, 2);
  orig.each((i, ele) => {
    if (i == 0) {
      t.false($(ele).hasClass('num'));
      t.false($(ele).hasClass('new'));
    }
    if (i == 1) {
      t.true($(ele).hasClass('num'));
      t.false($(ele).hasClass('new'));
    }
  });
});

test('tests remove from the clone', t => {
  const $ = cheerio.load(html, null, false);
  const copy = $.root().clone();

  // use the original Cheerio $ instance
  // with passing the element from the cloned root element
  $(copy.find('#content p')).remove();

  //-- check the cloned document --

  // same as copy.find('#content p').
  // $(copy) sets the root context with copy and does not infulence the orignaly loaded root context
  const p = $(copy).find('#content p');
  t.is(p.length, 0);

  //-- check the original document --

  // $().find() has no root context. Use $.root().find()
  // to use find() on default context
  const orig = $.root().find('#content p');
  t.is(orig.length, 2);
  orig.each((i, ele) => {
    if (i == 0) {
      t.false($(ele).hasClass('num'));
      t.false($(ele).hasClass('new'));
    }
    if (i == 1) {
      t.true($(ele).hasClass('num'));
      t.false($(ele).hasClass('new'));
    }
  });
});
