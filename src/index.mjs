#!/usr/bin/env node

/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */

'use strict';

import { makeChunks, newDOM, printer } from './DOM.mjs';
import { makeConfig } from './CommandOptions.mjs';
import { exists, copyRelativeFiles, mkdirs } from './Files.mjs';
import path from 'path';

const sampleHTML = 'test/resources/output/single/sample.html';
const sampleConfig = {
  outdir: 'html_chunks',
  depth: {
    default: 1, // the default extracton is chapter level
    2: 4, // extracts subsubsections in chap2
    3: 2 // extracts sections in chap 3
  },
  css: ['asciidoctor-chunker.css'],
  strictMode: true,
  titlePage: 'Titlepage',
};

const defaultConfig = {
  depth: 1, // the default extracton is chapter level
  outdir: 'html_chunks',
  css: ['asciidoctor-chunker.css'],
  strictMode: true,
  titlePage: 'Titlepage',
};


const main = async (adocHtmlFile, config = defaultConfig) => {
  const { outdir } = config;
  if (!await exists(outdir)) await mkdirs(outdir);
  const writer = printer(outdir);
  const dom = newDOM(adocHtmlFile);
  copyRelativeFiles(adocHtmlFile, outdir)(dom.root());
  makeChunks(writer, dom, config);
  console.log(`Successfully chunked! => ${path.join(outdir, 'index.html')}\n`);
}

console.log();
const { singleHTML, config } = makeConfig(process.argv, defaultConfig);

main(singleHTML, config);
