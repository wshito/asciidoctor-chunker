/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyIfNewer } from './Files.mjs';

const fsp = fs.promises;

/**
 * Extracts the embedded CSS within the style element in asciidoctor's
 * single html and saves each style element in `outDir/styleNUM.css`
 * where NUM is replaced with the index number of style elements.
 *
 * The style element is replaced with `<link rel='stylesheet' href=....>`
 * appropriately referencing the external css file.
 *
 * @param {string} outDir The path to the output directory where
 *  the extracted sytle elements are saved in a separate CSS files.
 * @param {Node} rootNode The root node of asciidoctor's single html
 *  source file.
 * @returns {Node} the root node of asciidoctor's single html
 *  after extraction of css style elements.
 */
const extractCSS = (outDir) => (rootNode) => {
  rootNode.find('style').each((node, i) => {
    const basename = `style${i}.css`;
    if (outDir) { // in test mode outDir is undefined
      fsp.writeFile(
        path.join(outDir, basename),
        node.contents().text());
    }
    node.replaceWithHTML$(`<link rel='stylesheet' href='${basename}' type='text/css' />`);
  });
  return rootNode; // returns the root node for the method chain
};

/**
 * Inserts `<link rel='stylesheet' href=...>` in the document head
 * for referencing the the custom CSS files set in `config.css`.
 *
 * @param {object} config the config object which has `css` field that
 *  holds the array of custom CSS file names to be used along with chunked
 *  HTML.
 * @param {Node} rootNode the root node of asciidoctor's single HTML.
 * @returns {Node} the root node of asciidoctor's single HTML for the method chain.
 */
const insertCSS = (config) => (rootNode) => {
  const { css, outdir } = config;
  if (!css || css.length == 0) return rootNode;
  const head = rootNode.find('head');
  css.forEach(cssFile => {
    _appendCSSLink(head, cssFile);
    if (outdir) { // in test mode outdir is undefined
      _copyCSS(outdir, cssFile);
    }
  });
  return rootNode;
};

/**
 * Private function that inserts the css <link> element.
 * This is only meant to be uased
 * from the public function `insertCSS()`.
 *
 * This is exported only for the unit test.
 *
 * @param {Node} node the node where the CSS link should be
 *  appended to.  It is usually the <head> node.
 * @param {string} cssFile path to the css file to include
 */
const _appendCSSLink = (node, cssFile) => {
  const basename = path.basename(cssFile);
  node.appendHTML$(`<link rel="stylesheet" href="${basename}" type="text/css" />`);
}

/**
 * Private function that copies the css file into the
 * output directory.  This is only meant to be uased
 * from the public function `insertCSS()`.
 *
 * This is exported only for the unit test.
 * 
 * @param {string} outdir path to the output directory
 * @param {string} cssFile path to the css file to include
 */
const _copyCSS = (outdir, cssFile) => {
  const basename = path.basename(cssFile);
  const dest = path.join(outdir, basename);
  if (cssFile === 'asciidoctor-chunker.css') {
    return import( /* webpackMode: "eager" */
        './css/asciidoctor-chunker.css') // webpack bundle
      .then(module => fsp.writeFile(dest, module.default))
      .catch(e => {
        const __dirname = path.dirname(fileURLToPath(
          import.meta.url));
        const src = path.resolve(__dirname, 'css', 'asciidoctor-chunker.css');
        return copyIfNewer(src)(dest);
      }); // no bundle, regular file
  } else
    return copyIfNewer(cssFile)(dest);
}

/**
 * @deprecated
 * Returns the link url and also copies the css file into the output directory
 * which causes the side effect.
 *
 * @param {string} outdir path to the output directory
 * @param {string} cssFile path to the css file to include
 */
const cssLink$ = (outdir, cssFile) => {
  const basename = path.basename(cssFile);
  const dest = path.join(outdir, basename);
  if (cssFile === 'asciidoctor-chunker.css') {
    import( /* webpackMode: "eager" */
        './css/asciidoctor-chunker.css') // webpack bundle
      .then(module => fsp.writeFile(dest, module.default))
      .catch(e => {
        const __dirname = path.dirname(fileURLToPath(
          import.meta.url));
        const src = path.resolve(__dirname, 'css', 'asciidoctor-chunker.css');
        copyIfNewer(src)(dest);
      }); // no bundle, regular file
  } else
    copyIfNewer(cssFile)(dest);
  return `<link rel="stylesheet" href="${basename}" type="text/css" />`;
}

export { insertCSS, extractCSS, _copyCSS, _appendCSSLink };
