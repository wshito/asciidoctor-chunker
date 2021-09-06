'use strict';

import { Cheerio } from '../node_modules/cheerio/lib/cheerio.js';

/**
 * Visits the nodes under the #content node and invoke
 * the given processor callbacks.
 *
 * @param {(root:boolean, node:{Cheerio}, isFirstPage:boolean)
 *  => void} preambleProcessor
 * @param {(root:boolean, node:{Cheerio}, partNumber:number,
 *  isFirstPage:boolean) => void} partProcessor
 * @param {(config:{object}, root:boolean, node:{Cheerio},
 *  thisSectLevel:number, filenamePrefix:{string},
 *  basenameFn:({string}, {number}, {number}) => {string},
 *  sectionNumber:number, isFirstPage:boolean) => void}
 *  chapterProcessor
 * @param {Cheerio} rootNode The document root node which is the
 *  instance of Cheerio.
 * @param {object} config: The configuration object which has
 *  `depth` object to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 *  The example format is as follows:
 *  ```
 *  {
 *    depth: {
 *      default: 1, // the default is to extract only chapters
 *      2: 4,  // extracts subsubsections in chap 2
 *      3: 2,  // extracts sections in chap 3
 *    }
 *  }
 *  ```
 *  @param {(string, number, number) => string} basenameMaker The
 *  function that generates the basename of the current html given
 *  the section information.
 */
const processContents = (
  preambleProcessor, partProcessor, chapterProcessor, rootNode, config, basenameMaker) => {
  const root = rootNode.clone();
  let chap = 0;
  let part = 0;
  let firstPageProcessed = false;
  let isFirstPage = false;
  root.find('#content').children().each((i, ele) => {
    const node = new Cheerio(ele);
    if (node.hasClass('partintro'))
      return; // ignore. this is taken care by part extraction
    if (node.hasClass('sect1')) {
      if (!firstPageProcessed && !isFirstPage) {
        isFirstPage = true;
        firstPageProcessed = true;
      } else
        isFirstPage = false;
      return chapterProcessor(config, root, node, 1, 'chap',
        basenameMaker, ++chap, isFirstPage); // recursive extraction of chapters
    }
    if (node.hasClass('sect0')) {
      if (!firstPageProcessed && !isFirstPage) {
        isFirstPage = true;
        firstPageProcessed = true;
      } else
        isFirstPage = false;
      // part extraction
      return partProcessor(config, root, node, ++part, isFirstPage);
    }
    if (node.attr('id') === 'preamble') {
      isFirstPage = true;
      firstPageProcessed = true;
      return preambleProcessor(config, root, node, isFirstPage);
    }
  });

};

export default processContents;
