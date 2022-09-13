/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import test from 'ava';
import makeHashTable from '../src/MakeHashTable.mjs';
import Node from '../src/Node.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';

test('makeHashtable()', t => {
  const rootNode = Node.getInstanceFromFile(sampleHTML);
  const config = {
    depth: {
      default: 1, // the default extracton is chapter level
      2: 4, // extracts subsubsections in chap2
      3: 2 // extracts sections in chap 3
    }
  };
  const ht = makeHashTable(rootNode, config);
  t.is(ht.get('_first_chapter'), 'chap1.html');
  t.is(ht.get('_part_i'), 'part1.html');

  // test page structure information in hashtable
  const pageNav = ht.get('navigation');
  const { filename2pageNum, filenameList } = pageNav;
  filenameList.forEach((f, i, arry) =>
    t.is(arry[filename2pageNum[f]], f));
  // console.log(filenameList);
  // console.log(filename2pageNum);
});
