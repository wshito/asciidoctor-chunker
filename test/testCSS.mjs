/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import { rm, exists, mkdirs } from '../src/Files.mjs';
import { insertCSS, extractCSS, _appendCSSLink, _copyCSS } from '../src/CSS.mjs';
import Node from '../src/Node.mjs';

// css test output dir
const OUTDIR = 'test/resources/output/testCSS';
// single html generated from ascii-doctor
const SINGLE_HTML = 'test/resources/output/single/sample.html'

test.before(async t => {
  await rm(OUTDIR);
  await mkdirs(OUTDIR)
});

test.after.always(async t => {
  await rm(OUTDIR);
});

/**
 * This test creates a file ${OUTDIR}/style0.css during the test.
 * It will be removed after the test.
 */
test('tests extractCSS()', async t => {
  await rm(`${OUTDIR}/style0.css`);
  const extractor = await extractCSS(OUTDIR);
  const rootNode = Node.getInstanceFromFile(SINGLE_HTML);
  const root = await extractor(rootNode);
  const res = await exists(`${OUTDIR}/style0.css`);
  t.true(res);

  const link = root.find('link').get(1);
  t.is(link.getAttr('href'), 'style0.css');
});

test('tests _appendCSSLink()', async t => {
  const rootNode = Node.getInstanceFromFile(SINGLE_HTML);
  const before = rootNode.find('link[href="asciidoctor-chunker.css"]');
  t.is(before.length, 0);
  const head = rootNode.find('head');
  _appendCSSLink(head, 'asciidoctor-chunker.css');
  const after = rootNode.find('link[href="asciidoctor-chunker.css"]');
  t.is(after.length, 1);
});

/**
 * This test creates a file ${OUTDIR}/asciidoctor-chunker.css during the test.
 * It will be removed after the test.
 */
test('tests _copyCSS()', async t => {
  const cssFile = `${OUTDIR}/asciidoctor-chunker.css`;
  await rm(cssFile);
  t.false(await exists(cssFile));
  await _copyCSS(OUTDIR, 'asciidoctor-chunker.css');
  t.true(await exists(cssFile));
});
