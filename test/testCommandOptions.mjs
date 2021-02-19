/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import { parseDepth } from '../src/CommandOptions.mjs';
import test from 'ava';

test('Depth specifiers', t => {
  t.deepEqual(
    parseDepth('3:4,5:2'), {
      default: 1,
      '3': 4,
      '5': 2
    }
  );
  t.deepEqual(
    parseDepth('10,3:4,5:2'), {
      default: 10,
      '3': 4,
      '5': 2
    }
  );
  t.deepEqual(
    parseDepth('3:4,7,3-5:2'), {
      default: 7,
      '3': 2,
      '4': 2,
      '5': 2
    }
  );
  t.deepEqual(
    parseDepth('6-8:5,3-5:2'), {
      default: 1,
      '3': 2,
      '4': 2,
      '5': 2,
      '6': 5,
      '7': 5,
      '8': 5
    }
  );

});
