/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

/**
 * This test file is to study Cheerio API's behavior so
 * this is independent from the project codes.
 * 
 * src/Node.mjs is implemented based on this study.
 */
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

// Inserts content as the last child of each of the selected elements
// and returns this element
test("tests append's returned value", t => {
  const $ = cheerio.load(html);
  // console.log($.html());
  t.is($.root().find('#content').children().length, 2); // before
  const ret = $.root().find('#content').append('<p>Appended</p>');
  t.is($.root().find('#content').children().length, 3); // after appended
  // console.log($.html());
  // append() returns the same context, so `ret` points to `#content`
  t.is(ret.children().length, 3);
});

test('tests append to the cloned non-root element', t => {
  const $ = cheerio.load(html, null, false);
  const copy = $.root().clone(); // need to keep the root node to output html or access the whole DOM tree
  const container = $(copy).find('#content').empty();

  // use the original Cheerio $ instance
  // with passing the element from the cloned root element
  $(container).append('<p class="new">appended</p>');
  /*          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    changes the state of container
    container now points appended <p class="new"> element
    chck the console.log below
  */
  // console.log(
  //   $(container).html(), '\n----\n',
  //   $(copy).html(), '\n----\n',
  //   $.html());

  //-- check the cloned document --
  // same as copy.find('#content p').
  // $(copy) sets the root context with copy and does not infulence the orignaly loaded root context
  const p = $(copy).find('#content p');
  t.is(p.length, 1);
  p.each((i, ele) => {
    t.true($(ele).hasClass('new')); // $(this) does not work
    t.false($(ele).hasClass('num'));
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
