/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import { getChapterProcessor } from './Chapters.mjs';
import processContents from './ContentProcessor.mjs';
import getFilenameMaker from './FilenameMaker.mjs';

/**
 * Returns the hashtable (Map instance) of (id, url).
 * The url is where the id is defined.  If id is 'foo', the url is
 * 'filename.html#foo' except the title element of the chunked page.
 * The title element's url is simply the filename wihout the hashed id.
 *
 * You can also obtain the object {filename, pageNum} from this
 * hashtable with the key 'navigation'.  You can use this array
 * to obtain previous and next page filename.
 *
 * @param {Node} rootNode The root node
 * @param {object} config The config object for extraction settings.
 */
const makeHashTable = (rootNode, config) => {
  const ht = new Map();
  const filename2pageNum = {};
  const filenameList = [];
  let pageNum = 0;
  // record (ID, url) pair in the hashtable
  // when the id is the top element in the page
  // remove the hash so the page top is displayed properly
  const recordIds = (node, filename) => {
    // keep track of filenames
    filename2pageNum[filename] = pageNum;
    filenameList[pageNum] = filename;
    pageNum++;
    // Set id and URL
    node.find('*[id]').each((e, i) => {
      const id = e.getAttr('id');
      if (id.startsWith('_footnotedef_')) return;
      ht.set(id, `${filename}#${id}`);
    });
    // remove the hash from the URL
    if (node.getAttr('id')) // for preamble and part
      ht.set(node.getAttr('id'), filename);
    else // for chapters and sections
      ht.set(node.children().first().getAttr('id'), filename);
  };
  const recordPreambleIds = (config, container, preambleNode, isFirstPage) => {
    recordIds(preambleNode, isFirstPage ? 'index.html' : 'preamble.html');
  };
  const recordPartIds = (config, container, partTitleNode, partNum, isFirstPage) => {
    recordIds(partTitleNode, isFirstPage ? 'index.html' : `part${partNum}.html`);
  };
  const recordChapterIds =
    getChapterProcessor((config, filename, container, node, isFirstPage) => {
      recordIds(node, isFirstPage ? 'index.html' : `${filename}.html`);
    });
  processContents(
    recordPreambleIds,
    recordPartIds,
    recordChapterIds,
    rootNode,
    config,
    getFilenameMaker() // pass the filename maker to create a filename
  );
  ht.set('navigation', { filename2pageNum, filenameList });
  return ht;
}

export default makeHashTable;
