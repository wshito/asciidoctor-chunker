/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import { pipe, compose } from '../src/FP.mjs';

const add5 = x => x + 5;
const mult10 = x => x * 10;

test('pipe', t => {
  t.is(130, pipe(add5, mult10)(8));
  t.is(85, pipe(mult10, add5)(8));
});

test('compose', t => {
  t.is(130, compose(mult10, add5)(8));
  t.is(85, compose(add5, mult10)(8))
});
