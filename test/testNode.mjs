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
  const node = Node._getInstance(html);
  const div = node.find('div');
  t.is(div.attr('id'), 'content');
  div.attr('id', 'modified');
  t.is(node.find('div').attr('id'), 'modified');
});

test('tests appendHTML()', t => {
  const node = Node._getInstance(html);
  const content = node.find('#content');
  t.is(content.children().length, 2); // before append()
  const ret = content.appendHTML('<p>Appended</p>');
  t.is(content.children().length, 3); // after append()
  t.is(ret.children().length, 3); // check if returned node is content
});

test('tests appendNode()', t => {
  const node = Node._getInstance(html);
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
  const node = Node._getInstance(html);
  t.is(node.find('body').children().length, 3);
  t.is(node.find('#content').children().length, 2);
});

test("tests clone()", t => {
  const orig = Node._getInstance(html);
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
  const node = Node._getInstance(html);

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

test("test text()", t => {
  const node = Node._getInstance(html);

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
