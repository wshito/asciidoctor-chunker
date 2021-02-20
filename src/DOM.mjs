/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import { pipe } from './Utils.mjs';
import * as D from './DomFunc.mjs';
import {
  relative2absolute,
  copyIfNewer
} from './Files.mjs';

const fsp = fs.promises;

/*
 * Module to provide the Asciidoctor single HTML specific
 * DOM manipulations.
 */

/**
 * Returns a new DOM wrapped with the jQuery interface.
 *
 * @param {string} filename
 * @returns the DOM wrapped with the jQuery interface.
 */
export function newDOM (filename) {
  return cheerio.load(fs.readFileSync(filename));
}

/**
 * Returns the div#content node where all the document
 * contents are appended to.
 * 
 * @param {Cheerio} node The DOM which has #content node.
 */
export const getContentNode$ = (node) =>
  D.find$('#content')(node);

/**
 * Returns the first id of the given page.
 *
 * @param {Cheerio} contentNode The Cheerio instance that
 *  context is pointint `#content`.
 */
export const getFirstContentId = (contentNode) =>
  contentNode.children().first().attr('id') ||
  contentNode.children().first().children().first().attr('id');

/**
 * This function creates a new container with contents
 * appended at #content element.  The contents is also cloned
 * internally before appended.
 *
 * @param {Function} referredFootnotesKeeper$ the curried functon of
 *  keepReferredFootnotes$(footnoteDefIds:: Map<string>).
 * @param {Map<id, filename>} hashtable The hashtable of
 *  (key, value) = (id, filename), plus the
 *  ('navigation', {filename, pageNum})
 * @param {Cheerio} container The Cheerio instance of DOM which
 *  has #content element to append the contents.  This function
 *  does not touch the passed container.  The container is cloned
 *  and then attach the contents.
 * @param {Cheerio} contents The Cheerio instance of DOM node
 *  to be appended to the container.  The contents are cloned
 *  internally and then appended.
 * @returns The newly created Cheerio instance of the document
 *  with contents appended.
 */
export const makeDocument = (referredFootnotesKeeper$, hashtable) =>
  (config, basename, container, ...contents) => {
    const linkRewriter = updateLinks(hashtable);
    const nodes = contents.map(linkRewriter);
    const newContainer = D.clone(container);
    return pipe(
      getContentNode$,
      D.append$(...nodes), // dom.append$() clones contents
      updateFootnotes(referredFootnotesKeeper$(newContainer.find('#footnotes'))),
      addPageNavigation(basename, hashtable.get('navigation'))
    )(newContainer);
  };

/**
 * Creates the basename for output html file based on
 * the section level and section number.  Eg. chap1, chap1_sec3-2.
 * @param {string} fnamePrefix
 * @param {number} thisSecLevel
 * @param {number} sectionNumber
 */
const basename = (fnamePrefix, thisSecLevel, sectionNumber) =>
  thisSecLevel === 1 ? `${fnamePrefix}${sectionNumber}` :
  thisSecLevel === 2 ? `${fnamePrefix}_sec${sectionNumber}` : `${fnamePrefix}-${sectionNumber}`;

/*
  extract inside the bracket:
    [#preamble]
    [.sect0, some nodes]
    [.sect1,
       +-- some nodes]
       +-- [.sect2
             +-- some nodes]
             +-- [sect3
                   +-- some nodes
                   +-- and so on...]
    [.sect1, ...]
    [.sect0, ...]

  So #preamble and .sect0 do not go into recursively.
  sect0 is for Part.  sect1 is for Chapter.
  sect1 (h2) -- sect5 (h6)
*/

/**
 * Process the nodes with 'sectN' classname where N >= 1
 * recursively.  This function does not return anything.
 * This takes processor callback to handle actual task
 * on each visitng nodes.
 *
 * The visiting nodes processing has been abstracted
 * so the creation of ID-filename hashtable can also
 * use this code.
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} processor
 *  The callback which takes the filename prefix and Cheerio
 *  instance and do some chapter content processing.
 * @param {object} config: The configuration object which has
 *  `depth` property to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 * @param {object} config.depth The configuration to specify the
 *  maximum sectLevel to extract.  The example format is as follows:
 *  ```
 *  depth: {
 *    default: 1, // the default is to extract only chapters
 *    2: 4,  // extracts subsubsections in chap 2
 *    3: 2,  // extracts sections in chap 3
 *  }
 *  ``` 
 * @param {Cheerio} container Cheerio instance of container DOM which has the appending point: `#content`.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {number} sectionNumber The section number in the current section level.
 * @param {boolean} isFirstPage true if this is the index.html page.
 */
export const processChapters = processor => {
  const _processChapters =
    (config, container, node, thisSectLevel, fnamePrefix, sectionNumber, isFirstPage) => {
      const maxLevel = config.depth[sectionNumber] || config.depth.default;
      const filename = isFirstPage ? 'index' : basename(fnamePrefix, thisSectLevel, sectionNumber);
      // case with no extraction
      if (maxLevel === thisSectLevel) {
        processor(config, filename, container, node, isFirstPage)
        return;
      }
      const childSelector = `div.sect${thisSectLevel+1}`;
      // extract myself
      processor(config, filename, container, D.remove(childSelector)(node), isFirstPage);

      // get children nodes
      const children = node.find(childSelector);
      if (children.length === 0) {
        return;
      }
      // go into children nodes to extract.
      // make sure to return to make it tail call to minimize the stack
      return children.each((i, ele) =>
        _processChapters(config, container,
          cheerio(ele), // ele is DOM node.  Wrap it with Cheerio object
          thisSectLevel + 1,
          filename, i + 1,
          false)); // isFirstPage = false
    };
  return _processChapters;
};

/**
 * Creates new DOM with empty content.
 *
 * @param {Cheerio} $ The instance of Cheerio.
 */
export const makeContainer = ($) => D.empty('#content')($.root());;

/**
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback
 *  which takes the filename prefix and Cheerio instance maily to print or
 *  write out to the file.
 * @param {Cheerio} container The dom holding `div#content` as a attaching point
 *  for extracted chapters and sections.  This is passed and kept in closure
 *  beforehand to be used as a template repeatedly.
 * @param {Cheerio} rootNode The root node where this `preamble` node is
 *  extracted from.  This argument is not used in this function.
 * @param {Cheerio} preambleNode The preamble node that is 'div#preamble'.
 * @param {boolean} isFirstPage true if this is the first page as index.html.
 */
export const extractPreamble = (printer, container, documentMaker) =>
  (config, rootNode, preambleNode, isFirstPage) => {
    const basename = isFirstPage ? 'index' : 'preamble';
    printer(basename, documentMaker(config, basename, container, preambleNode));
  }

const makePartDocument = (config, basename, container, partTitleNode, documentMaker) =>
  documentMaker(config, basename, container, ...(partTitleNode.next().hasClass('partintro') ? [partTitleNode, partTitleNode.next()] : [partTitleNode]));

/**
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback
 *  which takes the filename prefix and Cheerio instance maily to print or
 *  write out to the file.
 * @param {Cheerio} container The dom holding `div#content` as a attaching point
 *  for extracted chapters and sections.  This is passed and kept in closure
 *  beforehand to be used as a template repeatedly.
 * @param {Cheerio} rootNode The root node where this `part` node is extracted
 *  from.  This argument is not used in this function.
 * @param {Cheerio} partTitleNode The part title node that is 'h1.sect0'.
 * @param {number} partNum The part number.
 */
export const extractPart = (printer, container, documentMaker) =>
  (config, rootNode, partTitleNode, partNum, isFirstPage) => {
    const basename = isFirstPage ? 'index' : `part${partNum}`;
    printer(basename,
      makePartDocument(config, basename, container, partTitleNode, documentMaker));
  };

/**
 * Extracts the node with 'sectN' classname where N >= 1
 * recursively and attaches to container's `div#content`.
 * This function does not return anything.
 * This takes printer function for side effect.
 *
 * First two args `printer` and `container` is curried.  The container,
 * where the extracted chap and sections are attached to, is reused by
 * cloning.  Make sure to create a template first so you do not have
 * to create the currounding container verytime you extract the chapters
 * and sections.
 *
 * @param {(fnamePrefix: string, dom: Cheerio) => void} printer The callback
 *  which takes the filename prefix and Cheerio instance maily to print or
 *  write out to the file.
 * @param {Cheerio} container The dom holding `div#content` as a attaching point
 *  for extracted chapters and sections.  This is passed and kept in closure
 *  beforehand to be used as a template repeatedly.
 * @param {number} maxLevel The maximum secLevel to extract.
 * @param {Cheerio} rootNode The Cheerio instance of the root node where
 *   this chapter `node` is extracted from.  This argument is not used in
 *   this function.
 * @param {Cheerio} node The current section node extracted from DOM.
 * @param {number} thisSectLevel the current node's section level where chapter is level 1, section is level 2, and so on.
 * @param {string} fnamePrefix The filename prefix.
 * @param {number} sectionNumber The section number in the current section level.
 */
export const extractChapters = (printer, container, documentMaker) =>
  // the argument is the processor function that will be used
  // inside the processChapters().
  processChapters((config, basename, rootNode, node, isFirstPage) => {
    printer(basename, documentMaker(config, basename, container, node));
  });

/**
 * Visit the nodes under the #content node and invoke
 * the given processor callbacks.
 *
 * @param {(root:boolean, node:{Cheerio}, isFirstPage:boolean)
 *  => void} preambleProcessor
 * @param {(root:boolean, node:{Cheerio}, partNumber:number, isFirstPage:boolean)
 *  => void} partProcessor
 * @param {(config:{object}, root:boolean, node:{Cheerio}, thisSectLevel:number, 
 *   filenamePrefix:{string}, sectionNumber:number, isFirstPage:boolean)
 *  => void} chapterProcessor
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
 */
const processContents = (
  preambleProcessor, partProcessor, chapterProcessor, rootNode, config) => {
  const root = rootNode.clone();
  let chap = 0;
  let part = 0;
  root.find('#content').children().each((i, ele) => {
    const node = cheerio(ele);
    const isFirstPage = i === 0;
    if (node.hasClass('partintro'))
      return; // ignore. this is taken care by part extraction
    if (node.hasClass('sect1'))
      return chapterProcessor(config, root, node, 1, 'chap',
        ++chap, isFirstPage); // recursive extraction of chapters
    if (node.hasClass('sect0'))
      return partProcessor(config, root, node, ++part, isFirstPage); // part extraction
    if (node.attr('id') === 'preamble')
      return preambleProcessor(config, root, node, isFirstPage);

    console.log('Woops, unknown contents here to be processed.')
  });
};

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
 * @param {Cheerio} rootNode The root dom
 * @param {object} config The config object for extraction settings.
 */
export const makeHashTable = (rootNode, config) => {
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
    node.find('*[id]').each((i, e) => {
      const id = cheerio(e).attr('id');
      if (id.startsWith('_footnotedef_')) return;
      ht.set(id, `${filename}#${id}`);
    });
    // remove the hash from the URL
    if (node.attr('id')) // for preamble and part
      ht.set(node.attr('id'), filename);
    else // for chapters and sections
      ht.set(node.children().first().attr('id'), filename);
  };
  const recordPreambleIds = (config, container, preambleNode, isFirstPage) => {
    recordIds(preambleNode, isFirstPage ? 'index.html' : 'preamble.html');
  };
  const recordPartIds = (config, container, partTitleNode, partNum, isFirstPage) => {
    recordIds(partTitleNode, isFirstPage ? 'index.html' : `part${partNum}.html`);
  };
  const recordChapterIds =
    processChapters((config, filename, container, node, isFirstPage) => {
      recordIds(node, isFirstPage ? 'index.html' : `${filename}.html`);
    });
  processContents(
    recordPreambleIds,
    recordPartIds,
    recordChapterIds,
    rootNode,
    config
  );
  ht.set('navigation', { filename2pageNum, filenameList });
  return ht;
}

export const printer = outDir => (fnamePrefix, dom) => {
  const fname = path.format({
    dir: outDir,
    base: `${fnamePrefix}.html`
  });
  fsp.writeFile(fname, dom.html()).catch(err =>
    console.log("File write error:", fname));
}

const addTitlepageToc$ = (rootNode) => {
  cheerio('<li><a href="index.html">Titlepage</a></li>').insertBefore(rootNode.find('div#toc ul.sectlevel0 > li:first-child'));
  return rootNode;
}
/**
 * Make chunked html.  This is the main function to extract
 * whole book of adoc html file.
 * This function does not return anything.  This takes
 * a printer function for side effect.
 *
 * @param {(fnamePrefix: string, dom: Cherrio) => void} printer The callback which takes the filename prefix and Cheerio instance maily to print or write out to files.
 * @param {Cheerio} $ The instance of Cheerio.
 * @param {object} config: The configuration object which has
 *  `depth` object to specify the maximum sectLevel to extract.
 *  The default is 1 which extracts parts and chapters.
 * @param {object} config.depth The configuration to specify the 
 *  maximum sectLevel to extract.  The example format is as follows:
 *  ```
 *  depth: {
 *    default: 1, // the default is to extract only chapters
 *    2: 4,  // extracts subsubsections in chap 2
 *    3: 2,  // extracts sections in chap 3
 *  }
 *  ```
 */
export const makeChunks = (printer, $, config) => {
  const ht = makeHashTable($.root(), config); // Map<id, filename>
  const linkRewriter = updateLinks(ht);
  const container = pipe(
    makeContainer,
    linkRewriter,
    extractCSS(config.outdir),
    insertCSS(config),
    addTitlepageToc$
  )($)
  // addTitlepageToc$(container); // add titlepage link in the toc
  const footnotesKeeper$ =
    keepReferredFootnotes$(getFootnoteDefIds($('#footnotes')));
  // delegates recursive processing to processContents()
  // by passing three processors to handle each contents.
  processContents(
    extractPreamble(printer, container, makeDocument(footnotesKeeper$, ht)),
    extractPart(printer, container, makeDocument(footnotesKeeper$, ht)),
    extractChapters(printer, container, makeDocument(footnotesKeeper$, ht)),
    $.root(),
    config);
}

/**
 * @param {Map<id, url>} ht the Hashtable of <id, url>.  If id is 'foo' then
 *  url is 'filename.html#foo' where the filename is where the id is defined.
 */
const updateLinks = (ht) => (node) => {
  node.find('a[href]').each((i, ele) => {
    const a = cheerio(ele);
    const url = a.attr('href');
    // footnote is always whithin the chunked page so no need to rewrite
    if (url.startsWith('#') &&
      !url.startsWith('#_footnotedef_') &&
      !url.startsWith('#_footnoteref_')) {
      const id = url.substring(1);
      a.attr('href', `${ht.get(id)}`);
    }
  });
  return node;
}

/**
 * Returns set of footnote ids in String.
 *
 * @param footnotesNode Cheerio instance of `div#footnotes`
 * @returns {Set<string>} The Set instance with footnote ids.
 */
export const getFootnoteDefIds = (footnotesNode) => {
  const fnoteDefIds = new Set();
  footnotesNode.find('div.footnote').each((i, ele) => {
    fnoteDefIds.add(cheerio(ele).attr('id'));
  });
  return fnoteDefIds;
};

/**
 * Returns Cheerio instance of selections of footnote referers anchor elements.
 * 
 * @param {Cheerio} contentNode The `div#content` node.
 * @returns {Cheerio} the Cheerio instance of selections of footnote
 *   referers anchor elements.
 */
export const findFootnoteReferers = (contentNode) => contentNode.find('a.footnote');

/**
 * Removes the unreferred footnotes from the page and returns
 * the Cheerio instance with selections of all the footnote referer anchor
 * nodes.
 * 
 * @param {Set<string>} footnoteDefIds The set of all the footnote def ids.
 * @param {Cheerio} footnotesNode The Cherrio instance of current page's
 *  #footnotes node.  The footnotes under this node will be modified.
 * @param {Cheerio} referers The Cheerio intance which holds found anchors that
 *  refers to a footnote.
 */
export const keepReferredFootnotes$ = (footnoteDefIds) =>
  (footnotesNode) => (referers) => {
    if (referers.length === 0) {
      footnotesNode.empty().end();
      return referers;
    }
    const removingFootnotes = new Set([...footnoteDefIds]);
    // console.log("before removing", removingFootnotes.size);
    // console.log("Referers length", referers.length);
    referers.each((i, ele) => {
      // console.log(cheerio(ele).attr('href'));
      removingFootnotes.delete(cheerio(ele).attr('href').substring(1));
    });
    // console.log("after removing", removingFootnotes.size);
    removingFootnotes.forEach(id => {
      // console.log("removing", id);
      footnotesNode.find(`#${id}`).remove().end();
    });
    return referers;
  };

/**
 * Adds referer id to anchor which refers to the multiply used footnote.
 * This has side effect that modifies some of referers anchor's id attribute.
 * 
 * @param {cheerio} referers The Cheerio instance with the selection of
 *  nodes that refer to multiply used footnotes.
 */
export const updateRefererId$ = (referers) => {
  if (referers.length === 0) return referers;
  const added = new Set();
  referers.each((i, ele) => {
    const a = cheerio(ele);
    if (a.attr('id')) return;
    const url = a.attr('href')
    if (added.has(url)) return;
    added.add(url);
    const refID = makeFootnoteRefId(url);
    a.attr('id', refID);
  });
  return referers;
};

/**
 * Converts the url `#_footnotedef_4` to `_footnoteref_4`.
 * 
 * @param {string} defURL The hash link to the footnote definition as 
 *   `_footnotedef_4`.
 * @returns corresponding referer's ID such as `_footnoteref_4`
 */
export const makeFootnoteRefId = (defURL) => `_footnoteref${defURL.substring(defURL.lastIndexOf('_'))}`;

/**
 * 
 * @param {Function} referredFootnotesKeeper$ the curried functon of
 *  keepReferredFootnotes$(footnoteDefIds:: Map<string>).
 * @param {Cheerio} node The root node of the chunked page.
 */
export const updateFootnotes = (referredFootnotesKeeper$) => (rootNode) => {
  // each footnote definition has `<div id='_footnotedef_4' class='footnote'>`
  // the referer has
  // `<a id='_footnoteref_4' href='#_footnotedef_4' class='footnote'>
  // multiply used footnote's referer does not have id as
  // `<a href='#_footnotedef_4' class='footnote'>
  //
  // if a[href='#_footnotedef_4'] is whithin the page,
  // div#_footnotedef_4 should be kept, and
  // and id='_footnoteref_4' should be added to the first
  // a[href='#_footnotedef_4'] in the page

  // see if there are referers]
  pipe(
    getContentNode$,
    // (a) => { console.log("here1"); return a },
    findFootnoteReferers,
    referredFootnotesKeeper$,
    updateRefererId$,
  )(rootNode);
  return rootNode;
}

const findCurrentPageTocAnchor = (fnamePrefix) => (rootNode) =>
  rootNode.find(`a[href^=${fnamePrefix}.html]`);

const markCurrent$ = node => node.addClass('current');
('class');

export const addPageNavigation = (basename, { filename2pageNum, filenameList }) =>
  (rootNode) => {
    const thisPageNum = filename2pageNum[`${basename}.html`];
    const prev = thisPageNum > 0 ? filenameList[thisPageNum - 1] : null;
    const next = thisPageNum < filenameList.length - 1 ? filenameList[thisPageNum + 1] : null;
    const html = createNav(prev, next);
    const div = rootNode.find('body > div:last-of-type');
    if (div.attr('id') === 'footer')
      cheerio(html).insertBefore(div);
    else
      cheerio(html).insertAfter(div);

    return rootNode;
  };

const createNav = (prev, next) => `
<nav>
  ${prev ?
    `<a rel="prev" href="${prev}" class="nav nav-prev"
        aria-keyshortcuts="Left">
        <i class="fa fa-angle-left"></i>
     </a>` : ''}
  ${next ?
    `<a rel="next" href="${next}" class="nav nav-next"
        aria-keyshortcuts="Right">
        <i class="fa fa-angle-right"></i>
     </a>` : ''}
  <div style="clear: both"></div>
</nav>
`;

const notRelative = /^#|https:|http:|file:/;

export const removeParameters = (url) => {
  const base = path.basename(url);
  const i = base.indexOf('?');
  return i === -1 ? url :
    path.join(path.dirname(url), base.substring(0, i));
}
/**
 * Extracts relative paths from tagName[attrName] elements
 * under the given dom node.
 *
 * @param {Cheerio} dom The Cheerio instance of DOM.
 */
const getLocalFiles = (dom) => {
  const localFiles = [];
  dom.find(`link[href], script[src], img[src]`).each((i, ele) => {
    const node = cheerio(ele);
    const url = node.attr('href') || node.attr('src');
    if (!url.match(notRelative) && !path.isAbsolute(url)) {
      localFiles.push(removeParameters(url));
    }
  });
  return localFiles;
};

export const copyRelativeFiles = (basefile, outDir) => (dom) => {
  const toAbsoluteInOutDir = (relativeFile) => path.join(outDir, relativeFile);
  const toAbsoluteInSrcDir = relative2absolute(basefile);

  getLocalFiles(dom).forEach(file =>
    copyIfNewer(toAbsoluteInSrcDir(file))
    (toAbsoluteInOutDir(file)).catch(e => console.log(`    Local file linked from the document is missing: ${toAbsoluteInSrcDir(file)}`)));
};

export const extractCSS = (outDir) => (rootNode) => {
  rootNode.find('style').each((i, e) => {
    const basename = `style${i}.css`;
    const node = cheerio(e);
    fsp.writeFile(path.join(outDir, basename),
      cheerio(e).contents().text());
    node.replaceWith(cheerio(`<link rel='stylesheet' href='${basename}' type='text/css' />`));
  });
  return rootNode;
};

/**
 * 
 * @param {object} config 
 */
export const insertCSS = (config) => (rootNode) => {
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
    import('./css/asciidoctor-chunker.css') // webpack bundle
      .then(content => fsp.writeFile(dest, content))
      .catch(e => copyIfNewer(path.join('src', 'css', 'asciidoctor-chunker.css'))(dest)); // no bundle, regular file
  } else
    copyIfNewer(cssFile)(dest);
  return `<link rel="stylesheet" href="${basename}" type="text/css" />`;
}
