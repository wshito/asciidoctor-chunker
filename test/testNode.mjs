/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import Node from '../src/Node.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';
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

test('tests appendNode$()', t => {
  const root = Node.getInstanceFromHTML(html);
  const content = root.find('#content');
  t.is(content.children().length, 2); // before appending
  const p1 = content.children().first();
  content.appendNode$(p1); // this should clone p1
  t.is(content.children().length, 3); // after appending

  // loading will create another DOM
  // the <p> element that belongs another DOM cannot be
  // added to this DOM.  Use appendHTML() instead
  // rather than loading the fragment of HTML
  /*
  const ps = [0, 1, 2].map(n => Node.getInstanceFromHTML(`<p>Added${n}</p>`, null, false));
  ps.forEach(e => content.appendNode$(e));
  t.is(content.children.length, 6);
  */
});

test('tests Node.appendNodesToTarget$()', t => {
  const root = Node.getInstanceFromHTML(html);
  const content = root.find('#content');
  t.is(content.children().length, 2);
  /* this does not work with append$() 
  const nodes = [
    Node.getInstanceFromHTML('<p id="appended1">One</p>', null, false),
    Node.getInstanceFromHTML('<p id="appended2">Two</p>', null, false),
    Node.getInstanceFromHTML('<p id="appended3">Three</p>', null, false)
  ];
  */
  const nodes2 = [
    '<p id="appended1">One</p>',
    '<p id="appended2">Two</p>',
    '<p id="appended3">Three</p>'
  ];
  Node.appendNodesToTarget$(...nodes2)(content);
  const res = content.children();
  t.is(res.length, 5);
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

test("tests find() with sample HTML", t => {
  const node = Node.getInstanceFromFile(sampleHTML);
  const content = node.find('#content');
  t.is(8, content.children().length);
  t.is('_first_chapter', content.children().get(3).children().first().getAttr('id'));
  const idNodes = content.find('*[id]');
  t.is(28, idNodes.length); // 28 ids under #content
  idNodes.each((e, i) => {
    if (i === 3) {
      t.is(e.text(), '1. First Chapter');
      t.is(e.getAttr('id'), '_first_chapter');
    }
  });
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

test('tests get()', t => {
  const node = Node.getInstanceFromHTML(html);
  /*      <p>first paragraph</p>
     <div id="content">// inside content
       <p>ORIGINAL</p>
       <p class="num">1</p> */
  const p = node.find('p');
  t.is(p.get(0).text(), 'first paragraph');
  t.is(p.get(1).text(), 'ORIGINAL');
  const p2 = p.get(2);
  t.is(p2.text(), '1');
  t.is(p2.getAttr('class'), 'num');
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
