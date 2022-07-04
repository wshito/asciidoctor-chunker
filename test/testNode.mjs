/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';

const html = `
  <html>
    <body>
     <h1>Hello World</h1>
     <p>first paragraph</p>
     <div id="content">
       <p>ORIGINAL</p>
       <p class="num">1</p>
     </div>
    </body>
  </html>`;

test('tests attr()', t => {
  const node = Node.getInstanceFromHTML(html);
  const div = node.find('div');
  t.is(div.attr('id'), 'content');
  div.attr('id', 'modified');
  t.is(node.find('div').attr('id'), 'modified');
});

test('tests appendHTML()', t => {
  const node = Node.getInstanceFromHTML(html);
  const content = node.find('#content');
  t.is(content.children().length, 2); // before append()
  const ret = content.appendHTML('<p>Appended</p>');
  t.is(content.children().length, 3); // after append()
  t.is(ret.children().length, 3); // check if returned node is content
});

test('tests appendNode()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const copy = node.clone();
  const content = node.find('#content');
  content.attr('id', 'content2'); // modify original content

  copy.find('body').appendNode(content); // append modified content

  const content2 = copy.find('#content2');
  t.is(content2.attr('id'), 'content2');

  t.is(copy.find('#content').length, 1);
  t.is(copy.find('#content2').length, 1);

  t.is(node.find('#content').length, 0); // since original content is modified
  t.is(node.find('#content2').length, 1);

  // console.log('ORIG\n', node.root().html());
  // console.log();
  // console.log('COPY\n', copy.root().html());
});

test('tests children()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  t.is(node.find('body').children().length, 3);
  t.is(node.find('#content').children().length, 2);
});

test("tests clone()", t => {
  const orig = Node.getInstanceFromHTML(html);
  const copy = orig.clone();
  const origText = orig.find('#content').text();
  const copyText = copy.find('#content').text();
  t.is(origText, copyText);
  copy.find('#content').text('replaced');

  t.not(orig.find('#content').text(), copy.find('#content').text());

  // make sure copy's current node is root even after text('replaced') invocation
  t.is(copy.find('p:first').text(), 'first paragraph');
});

test("tests find(selector)", t => {
  const node = Node.getInstanceFromHTML(html);

  // content points <div id="content">
  const content = node.find('#content');

  // tests if node keeps the original state
  // `node` should be pointing the root node
  const p = node.find('p'); // should find all the <p>
  t.is('first paragraphORIGINAL1', p.text());

  // should find only <p> under #content
  const contentP = content.find('p');
  t.is('ORIGINAL1', contentP.text());
});

test('test insertHtmlBefore()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const pNum = node.find('p.num');
  t.is(node.find('p').length, 3);
  const inserted = Node.insertHtmlBefore('<p><span>INSERTED</span></p>', pNum);
  // test if the returned node points the inserted node
  t.is(inserted.text(), 'INSERTED');
  // test if the arugment's selection has not changed
  t.is(pNum.text(), '1');
  // test insertion. node, pNum, inserted all shares the same DOM
  t.is(node.find('p').length, 4);
  t.is(node.find('p span').text(), 'INSERTED');
  t.is(pNum.prev().text(), "INSERTED");
  t.is(inserted.root().find('p').length, 4);
});

test('test insertHtmlAfter()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const pNum = node.find('p.num');
  t.is(node.find('p').length, 3);
  const inserted = Node.insertHtmlAfter('<p><span>INSERTED</span></p>', pNum);
  // test if the returned node points the inserted node
  t.is(inserted.text(), 'INSERTED');
  // test if the argument's selection has not changed
  t.is(pNum.text(), '1');
  // test insertion: node, pNum, inserted, all shares the same DOM
  t.is(node.find('p').length, 4);
  t.is(node.find('p span').text(), 'INSERTED');
  t.is(pNum.next().text(), "INSERTED");
  t.is(inserted.root().find('p').length, 4);
});


test('test insertMeAfter()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const p = node.find('p.num');
  t.is(p.text(), '1');
  const p2 = Node.getInstanceFromHTML('<p class="num">2</p>', null, false);
  const mod = p2.insertMeAfter(p);
  t.is(node.find('.num').length, 2);
  t.is(node.find('#content').length, 1);
  t.is(node.find('#content').children().length, 3);
  t.is(mod.root().find('.num').length, 2);
  t.is(mod.root().find('#content').length, 1);
  t.is(mod.root().find('#content').children().length, 3);
  // console.log(node.root().html());
});

test('test insertMeBefore()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  t.is(node.find('.num').length, 1);

  const p = node.find('p.num');
  t.is(p.text(), '1');

  const p0 = Node.getInstanceFromHTML('<p class="num">0</p>');
  p0.insertMeBefore(p);
  t.is(node.find('.num').length, 2);
  // console.log(node.html());
});

test('test next()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const pNum = node.find('p.num');
  t.is(pNum.next().text(), ''); // p.num is the end
  t.is(pNum.text(), "1"); // test if the next() does not change `this` context
  const h1 = node.find('h1');
  t.is(h1.text(), 'Hello World');
  t.is(h1.next().text(), 'first paragraph');
  t.is(h1.text(), 'Hello World');
});

test('test prev()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const pNum = node.find('p.num');
  t.is(pNum.text(), "1");
  t.is(pNum.prev().text(), 'ORIGINAL');
  t.is(pNum.text(), "1"); // test if the next() does not change `this` context
  t.is(pNum.prev().length, 1);
  // two-times prev() does not go up the parent content
  t.is(pNum.prev().prev().length, 0);
});

test("test text()", t => {
  const node = Node.getInstanceFromHTML(html);

  // clones #content as a root
  const content = node.find('#content').clone();
  const before = content.html();
  content.text();
  const after = content.html();
  t.is(before, after);

  t.is(content.text("replaced").text(), "replaced");

  // clones from the root node
  const copy = node.clone();
  // let's see if the current context is unchanged after text(str) invocation
  copy.find('#content').text('replaced2');
  // console.log(copy.html()); // HTML output from the root
  t.is(copy.find('h1').text(), 'Hello World'); // search <h1> from the root
});
