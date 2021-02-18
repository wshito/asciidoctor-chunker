/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import test from 'ava';
import { exists, rm, mkdirs, sourceIsNewerThan } from '../src/Files.mjs';
import fs from 'fs';
const fsp = fs.promises;

test.skip('mkdirs()', async t => {
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
