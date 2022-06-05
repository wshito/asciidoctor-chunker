/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import * as cheerio from 'cheerio';

/**
 * Class to hold a DOM node or multiple DOM nodes while
 * providing the various DOM manipulation interfaces.
 * 
 */
class Node {
  /**
   * $: CheerioAPI
   * Provides the various static methods.
   */
  $;
  /**
   * root: Cheerio<Document>
   * The root Element that this node belongs in order
   * to access the root context for html serialization
   * and tree traversal.
   */
  rootNode;
  /**
   * Cheerio<Document | Element>
   * The current target context.
   */
  context;

  /**
   * Instantiates the new DOM from the filename.
   * 
   * @param {String} filename 
   */
  static getInstance(filename) {
    const $ = cheerio.load(fs.readFileSync(filename));
    return new Node($, $.root(), $.root());
  };

  /**
   * [For Internal use] Instantiates the new DOM node from the the html text.
   * 
   * @param {String} htmlText
   * @returns {Node} the newly constructed Node instance.
   */
  static _getInstance(htmlText) {
    const $ = cheerio.load(htmlText, null, false);
    return new Node($, $.root(), $.root());
  }

  /** [FOR INTERNAL USE] */
  constructor($, root, context) {
    this.$ = $;
    this.rootNode = root;
    this.context = context;
  }

  /**
   * Creates the completely independent DOM tree from the 
   * current node.  The returned instance points the currently
   * selected node as the root node.
   * 
   * If you want to clone the whole DOM tree, `node.root().clone()`
   * will make one.
   * 
   * @returns {Node} the cloned node.
   */
  clone() {
    const node = new Node();
    // $ is the CheerioAPI that provides the various static methods
    // CheerioAPI cannot be instantiated other than from load() so
    // we reuse the $ instance.
    node.$ = this.$;
    // node.rootNode = this.$.root().clone();
    const copy = this.$(this.context).clone();
    node.rootNode = copy;
    node.context = copy;
    return node;
  }

  /**
   * Gets or sets the attribute of this node.
   * Only the first element of the attribute in the
   * current node set is returned.
   * 
   * @param {*} attrName 
   * @param {*} value 
   * @returns {string} of attribute name or void if setter is called.
   */
  attr(attrName, value) {
    if (value) this.context.attr(attrName, value);
    else return this.context.attr(attrName);
  }

  /**
   * Query the selectorAll under the current node and 
   * returns the selections encapsulated in a Node instance.
   * The returned Node instance shares the root node and DOM
   * tree from this one.
   * 
   * @param {*} selector 
   * @returns {Node} the selected nodes encapsulated in a single Node instance.
   */
  find(selector) {
    const matched = this.$(this.context).find(selector);
    const node = new Node(this.$, this.rootNode, matched);
    this.context = matched.end(); // keep the original contex for the current node
    return node; // returns new Node instance that holds the selections as context
  }

  /**
   * Gets or sets the text node of current node.
   * If current node consists of multiple nodes, all the texts are joined without
   * delimiter.
   * @param {*} str 
   * @returns {string | Node} the text content of this node for getter
   *  and this Node instance if setter.
   */
  text(str) {
    if (str) {
      this.$(this.context).text(str);
      return this;
    } else return this.$(this.context).text();
  }

  html() {
    return this.$(this.context).html();
  }

  root() {
    const node = new Node(this.$, this.rootNode, this.rootNode);
    return node;
  }

}

export default Node;
