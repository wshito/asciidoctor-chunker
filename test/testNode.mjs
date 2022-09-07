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
     <div id="content">// inside content
       <p>ORIGINAL</p>
       <p class="num">1</p>
     </div>
    </body>
  </html>`;

test('tests addClass$()', t => {
  const node = Node.getInstanceFromHTML(html);
  const h1 = node.find('h1');
  h1.addClass$('added');
  t.is(h1.getAttr('class'), 'added');

  const pNum = node.find('p.num');
  t.is(pNum.getAttr('class'), 'num');
  pNum.addClass$('added2');
  t.is(node.find('p.num').length, 1);
  const added = node.find('p.num');
  t.is(added.getAttr('class'), 'num added2');
});

test('tests getAttr() and setAttr$()', t => {
  const node = Node.getInstanceFromHTML(html);
  const div = node.find('div');
  t.is(div.getAttr('id'), 'content');
  div.setAttr$('id', 'modified');
  t.is(node.find('div').getAttr('id'), 'modified');
});

test('tests appendHTML()', t => {
  const node = Node.getInstanceFromHTML(html);
  const content = node.find('#content');
  t.is(content.children().length, 2); // before append()
  const ret = content.appendHTML$('<p>Appended</p>');
  t.is(content.children().length, 3); // after append()
  t.is(ret.children().length, 3); // check if returned node is content
});

test('tests appendNode()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const copy = node.clone();
  const content = node.find('#content');
  const content2 = content.clone().setAttr$('id', 'content2');

  const body = copy.find('body');
  t.is(3, body.children().length); // 3 children orignally <h1>, <p>, <div>
  body.appendNode$(content2); // append to the copy

  t.is(copy.find('#content').length, 1);
  t.is(copy.find('#content2').length, 1);

  t.is(node.find('#content').length, 1);
  t.is(node.find('#content2').length, 0);

  // check if the copy of content2 is appended
  content2.setAttr$('id', 'content3');
  t.is(copy.find('#content').length, 1);
  t.is(copy.find('#content2').length, 1);
  t.is(copy.find('#content3').length, 0); // should not be there

  body.appendNode$(content2); // this is actually the '#content3'
  t.is(copy.find('#content3').length, 1);

  // if appendNode$() does not change the context, the children()
  // should return 3 + added 2 = 5
  t.is(5, body.children().length);
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

test("tests contents()", t => {
  const contents = Node.getInstanceFromHTML(html).find('#content').contents();
  t.is(contents.length, 5);
  // contents.each((e, i) => console.log(i, e.text()));
});

test('test each()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const content = node.find('#content').children();
  t.is(content.length, 2);
  let cnt = 0;
  content.each((node, idx) => {
    if (idx === 0) {
      t.is(node.text().trim(), 'ORIGINAL');
      cnt++;
    } else {
      t.is(node.text().trim(), '1');
      t.true(node.hasClass('num'));
      cnt++;
    }
  });
  t.is(2, cnt);

  // check break out the loop
  cnt = 0;
  content.each((node, idx) => {
    if (idx === 0) {
      t.is(node.text().trim(), 'ORIGINAL');
      cnt++;
      return false; // break out!
    } else {
      t.is(node.text().trim(), '1');
      t.true(node.hasClass('num'));
      cnt++;
    }
  });
  t.is(1, cnt);

  // node.find('body').children().each((ele) => console.log(ele.tagName));
});

test("tests empty()", t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const content = node.find('#content');
  t.is(2, content.children().length);
  const content2 = content.empty$();
  t.is(0, content.children().length); // 0
  t.is(0, content2.children().length); // 0
  t.true(content === content2);
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

test("tests first()", t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const children = node.find('body').children();
  const h1 = children.first();
  // children instance has no side-effect after the invocation of first()
  t.is(3, children.length);
  t.is(0, h1.children().length); // text is not a child element
  t.is("Hello World", h1.text());
});

test('test hasClass()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const p = node.find('#content').children().first().next();
  t.true(p.hasClass('num'));
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
  const mod = p2.insertMeAfter$(p);
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
  p0.insertMeBefore$(p);
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

test('test parent()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  const pNum = node.find('p.num');
  const parent = pNum.parent();
  t.is(parent.getAttr('id'), 'content');
  t.is(parent.tagName, 'div');
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

test('test remove()', t => {
  const node = Node.getInstanceFromHTML(html, null, true);
  t.is(1, node.find('#content').length);
  const node2 = node.remove$('#content');
  t.is(0, node2.find('#content').length);
  t.is(0, node.find('#content').length); // side-effect
});

test('test replaceWithHTML$()', t => {
  const node = Node.getInstanceFromHTML(html);
  const content = node.find('#content');
  content.replaceWithHTML$('<p>second paragraph</p>');
  const p = node.find('p');
  t.is(p.length, 2);
  const txt = ['first paragraph', 'second paragraph'];
  p.each((ele, i) => t.is(ele.text(), txt[i]));
  t.is(node.find('#content').length, 0)
});

test('test tagName', t => {
  const node = Node.getInstanceFromHTML(html);
  const content = node.find('#content');
  t.is(content.tagName, 'div');
  const p = content.children();
  t.is('p', p.tagName);
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
