'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';

const fsp = fs.promises;

const extractCSS = (outDir) => (rootNode) => {
  rootNode.find('style').each((i, e) => {
    const basename = `style${i}.css`;
    const node = new Cheerio(e);
    fsp.writeFile(path.join(outDir, basename),
      new Cheerio(e).contents().text());
    node.replaceWith(new Cheerio(`<link rel='stylesheet' href='${basename}' type='text/css' />`));
  });
  return rootNode;
};

/**
 *
 * @param {object} config
 */
const insertCSS = (config) => (rootNode) => {
  const { css, outdir } = config;
  if (!css || css.length == 0) return rootNode;
  const head = rootNode.find('head');
  css.forEach(cssFile => head.append(cssLink$(outdir, cssFile)));
  return rootNode;
};

/**
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

export { insertCSS, extractCSS };
