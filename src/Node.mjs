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

  get length() {
    return this.context.length;
  }

  /**
   * Instantiates the new DOM from the filename.
   * 
   * @param {String} filename 
   */
  static getInstanceFromFile(filename) {
    const $ = cheerio.load(fs.readFileSync(filename));
    return new Node($, $.root(), $.root());
  };

  /**
   * Instantiates the new DOM node from the the html text.
   * 
   * @param {String} htmlText
   * @param {Option} options object of Cheerio, default is `null`.
   * @param {boolean} isDocument true to have a DOM with html element as a root
   *  `false` to make DOM as given in `htmlText`.  Default is `false`.
   * @returns {Node} the newly constructed Node instance.
   */
  static getInstanceFromHTML(htmlText, options = null, isDocument = false) {
    const $ = cheerio.load(htmlText, options, isDocument);
    return new Node($, $.root(), $.root());
  }

  /** [FOR INTERNAL USE] */
  constructor($, root, context) {
    this.$ = $;
    this.rootNode = root;
    this.context = context;
  }

  /**
   * Gets or sets the attribute of this node.
   * Only the first element of the attribute in the
   * current node set is returned.
   * 
   * @param {*} attrName 
   * @param {*} value 
   * @returns {string | Node} the attribute name for the getter, and 
   *  returns this Node instance for the setter for method chain.
   */
  attr(attrName, value) {
    if (value) {
      this.context.attr(attrName, value);
      return this;
    } else return this.context.attr(attrName);
  }

  /**
   * Inserts content in HTML string as the last child of each
   * of the current node and returns this node for the method chain.
   * 
   * @param {string} htmlStr
   * @returns {this} for method chain
   */
  appendHTML(htmlStr) {
    this.$(this.context).append(htmlStr);
    return this;
  }

  /**
   * Inserts clone of the given node as the last child of each
   * of the current node and returns this node for the method chain.
   * 
   * Note that  the appending node is cloned for safety because the
   * node cannot be beloged mutlple DOM trees.  Thus, it is redundant
   * to clone by the caller although it is not harmful.
   * 
   * @param {Node} node Appending node which is cloned before appending.
   * @returns {this} for method chain
   */
  appendNode(node) {
    const copy = node.clone();
    this.$(this.context).append(copy.context);
    return this;
  }

  /**
   * @returns {Node} the node instance pointing the children.
   */
  children() {
    return new Node(this.$, this.root, this.context.children());
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

  html() {
    return this.$(this.context).html();
  }

  root() {
    const node = new Node(this.$, this.rootNode, this.rootNode);
    return node;
  }

  /**
   * Gets or sets the text node of current node.
   * If current node consists of multiple nodes, all the texts are joined without
   * delimiter.
   * @param {*} str 
   * @returns {string | Node} the text content of this node for getter
   *  and this Node instance if setter for method chain.
   */
  text(str) {
    if (str) {
      this.$(this.context).text(str);
      return this;
    } else return this.$(this.context).text();
  }

}

export default Node;
