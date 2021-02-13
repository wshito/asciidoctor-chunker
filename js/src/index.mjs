/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import fs from 'fs';
import { makeChunks, newDOM, printer } from './DOM.mjs';

const sampleHTML = 'test/resources/output/single/sample.html';

const main = (adocHtmlFile,
  outdir = 'html_chunks', depth = 1) => {
  // fs.mkdirSync(outdir);
  const writer = printer(outdir);
  const dom = newDOM(adocHtmlFile);
  makeChunks(writer, dom, 6);
}

main(sampleHTML);
