/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import { makeChunks, newDOM, printer } from './DOM.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';
const sampleConfig = {
  depth: {
    default: 1, // the default extracton is chapter level
    2: 4, // extracts subsubsections in chap2
    3: 2 // extracts sections in chap 3
  }
};

const main = (adocHtmlFile,
  outdir = 'html_chunks',
  config = { depth: { default: 1 } }) => {
  // fs.mkdirSync(outdir);
  const writer = printer(outdir);
  const dom = newDOM(adocHtmlFile);
  makeChunks(writer, dom, config);
  console.log(`Successfully chunked! => ${outdir}/index.html\n`);
}

main(sampleHTML, 'html_chunks', sampleConfig);
