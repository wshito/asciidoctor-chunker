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
