/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import {
  exists,
  rm,
  mkdirs,
  sourceIsNewerThan,
  copyIfNewer,
  relative2absolute,
} from '../src/Files.mjs';
import fs from 'fs';
const fsp = fs.promises;

test('mkdirs()', async t => {
  const path = await mkdirs('test/tmp/a/b/c')
  t.true(await exists(path));
  await rm('test/tmp');
  t.false(await exists(path));
});

test('sourceIsNewerThan()', async t => {
  const path = await mkdirs('test/tmp2/a/b/c');
  t.true(await sourceIsNewerThan(path)('test/abc'),
    'case with target not existed');
  t.true(await sourceIsNewerThan(path)('test/resources/Makefile'));
  t.false(await sourceIsNewerThan('test/resources/Makefile')(path));

  // cleanup
  await rm('test/tmp2');
  t.false(await exists('test/tmp2'));
});

test('copyIfNewer()', async t => {
  const target = 'test/tmp3/a/b/c/README.md';
  t.is(await copyIfNewer('README.md')(target), target); // must be copied
  t.is(await copyIfNewer('README.md')(target), false); // not be copied

  // cleanup
  await rm('test/tmp3');
  t.false(await exists('test/tmp3'));

});

test('relative2absolute()', t => {
  t.is(relative2absolute('a/b/c/index.html')('./d/e/f/g.html'), 'a/b/c/d/e/f/g.html');
  t.is(relative2absolute('a/b/c/index.html')('../d/e/f/g.html'), 'a/b/d/e/f/g.html');
  t.is(relative2absolute('a/b/c/index.html')('../../g.html'), 'a/g.html');
});
