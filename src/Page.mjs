/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */

'use strict';

import Node from './Node.mjs';

/**
 * Returns the Node instance of `div#content`.
 *
 * @param {Node} rootNode
 * @returns {Node} the `div#content` node.
 */
export const getContentNode = (rootNode) => rootNode.find('#content');

/**
 * Creates a new container page with `div#content` is empty from
 * the given DOM tree.  The created container's DOM is independent
 * from the given DOM.
 *
 * @param {Node} node The node instance 
 * @param {boolean} isStictMode true if extraction mode
 *  is in strict mode.  In strict mode, asciidoctor-chunker
 *  assumes there are only defult contents under div#content.
 *  If the mode is not strict, makeContainer() leaves unknown
 *  contents under div#content untouched.
 *  The default is false or undefined.
 *
 */
export const _makeContainer = (config) => (node) => {
  const { strictMode } = config;
  const root = node.clone().remove$('#content > #preamble, #content > .partintro, #content > .sect1, #content > .sect0');
  const content = root.find('#content');
  if (strictMode) { // in strict mode
    if (content.children().length > 0) {
      _showStrictModeMessage(content);
      content.empty$();
    }
  }
  return root;
}

const _showStrictModeMessage = (contentNode) => {
  // const getNodeInfo = node => `tag=${node.tagName} id=${node.getAttr('id')}, class=${node.getAttr('class')}`;

  console.log(`INFO: Non-Asciidoc contents encountered under <div id='#content'>.
INFO: They are ignored and not included in chunked html by default.
INFO: If you want them to be included, use the '--no-strictMode' command option.`);
  contentNode.html().trim().split(/\n+/).forEach(line => console.log(`INFO: Found content => ${line}`));
  console.log();
};
