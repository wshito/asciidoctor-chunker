/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2022 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
import * as cheerio from 'cheerio';

/**
 * Class to hold a currently selected DOM node or multiple DOM nodes
 * while providing the various DOM manipulation interfaces.
 * Use the static method `getInstanceFrom[File|HTML]()` to constuct
 * an instance.
 *
 * Basically all the instance methods return a new Node instance without
 * changing the selection of the Node instance passed in the argument.
 * The methods with `$` suffix returns the original Node instance without
 * creating new one.
 *
 * However, the returned Node instance may share the DOM tree with
 * the one in the argument.  Please refer to the method documentation
 * for details.
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
   * The current selections in the DOM.
   */
  context;

  /**
   * Returns the length of current selections.
   */
  get length() {
    return this.context.length;
  }

  /**
   * Returns the name of the tag currenlty selected.
   * If there are multiple emelements are selected
   * this returns the name of the first selection.
   */
  get tagName() {
    return this.context[0].name;
  }

  /**
   * Appends multiple nodes sequently to the target node.
   * This causes side effects that change the state of the target node.
   * The appending nodes are cloned and untouched.
   *
   * @param {[Node]} appendingNodes The array of appending nodes.
   *  These nodes are cloned before appending in `appendNode$()` method.
   * @param {Node} target The target node where nodes are appended to.
   */
  static appendNodesToTarget$ = (...appendingNodes) => target => {
    appendingNodes.forEach(ele => target.appendNode$(ele));
    return target;
  }

  /**
   * Static method thaat instantiates the new DOM from the filename.
   * 
   * @param {String} filename 
   */
  static getInstanceFromFile(filename) {
    const $ = cheerio.load(fs.readFileSync(filename));
    return new Node($, $.root(), $.root());
  };

  /**
   * Static method that instantiates the new DOM node from the the html text.
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

  /**
   * Static method that inserts the given html string before the target node
   * and returns the new Node instance that selects the inserted node within
   * the DOM tree where target node belongs.  This does not change the `targetNode`
   * selections.
   *
   * @param {String} html
   * @param {Node} targetNode 
   * @returns {Node} the new Node instance of which selection is the inserted node.
   *  The returned Node instance shares the DOM and the root with that of `targetNode`.
   */
  static insertHtmlBefore(html, targetNode) {
    targetNode.$(html).insertBefore(targetNode.context);
    return new Node(targetNode.$, targetNode.rootNode, targetNode.context.prev());
  }

  /**
   * Static method that inserts the given html string after the target node
   * and returns the new Node instance that selects the inserted node within
   * the DOM tree where target node belongs.  This does not change the `targetNode`
   * selections.
   *
   * @param {String} html
   * @param {Node} targetNode 
   * @returns {Node} the new Node instance of which selection is the inserted node.
   *  The returned Node instance shares the DOM and the root with that of `targetNode`.
   */
  static insertHtmlAfter(html, targetNode) {
    targetNode.$(html).insertAfter(targetNode.context);
    return new Node(targetNode.$, targetNode.rootNode, targetNode.context.next());
  }

  /** [FOR INTERNAL USE] */
  constructor($, root, context) {
    this.$ = $;
    this.rootNode = root;
    this.context = context;
  }

  /**
   * Adds the class value to this node and returns
   * `this` node.  If the current node is
   * `<div class="abc">` and invoking `addClass$("next")`
   * the node becomes `<div class="abc next">`.
   *
   * @param {string} classValue
   * @returns {Node} returns `this` Node instance for the
   *  method chain.
   */
  addClass$(classValue) {
    this.context.addClass(classValue);
    return this;
  }

  /**
   * Inserts content in HTML string as the last child of each
   * of the current node and returns `this` node instance
   * for the method chain.
   *
   * @param {string} htmlStr
   * @returns {this} for method chain
   */
  appendHTML$(htmlStr) {
    this.$(this.context).append(htmlStr);
    return this;
  }

  /**
   * Inserts clone of the given node as the last child of each
   * of the current node and returns `this` node instance for
   * the method chain.
   *
   * Note that the appending node is cloned for safety because the
   * node cannot be belonged mutlple DOM trees.  Thus, it is redundant
   * to clone by the caller although it is not harmful.
   *
   * @param {Node | string} node Appending node which is cloned
   *  before appending.
   * @returns {this} for method chain
   */
  appendNode$(node) {
    if (typeof node === 'string')
      this.context.append(node); // node is HTML string
    else {
      const copy = node.context.clone();
      // this.$(this.context).append(copy);
      this.context.append(copy);
    }
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
    const copy = this.$(this.context).clone();
    node.rootNode = copy; // the cloned node is now the new root!
    node.context = copy;
    return node;
  }

  /**
   * Returns the children of this node's context, including text and comment nodes.
   * 
   * @returns {Node} the new instance of contents nodes.
   */
  contents() {
    return new Node(this.$, this.rootNode, this.context.contents());
  }

  /**
   * Iterates the current selections with the callback.  To break
   * out the `each` loop, return `false` from the callback.
   *
   * @param {(Node, Number) => boolean} callback The callback
   *  function to be invoked to each node.
   */
  each(callback) {
    this.context.each((i, ele) => {
      return callback(new Node(this.$, this.context, this.$(ele)), i);
    });
  }

  /**
   * Removes all the children and returns `this` Node instance.
   *
   * @returns {Node} `this` object of which children are removed.
   */
  empty$() {
    this.context.empty();
    return this;
  }

  /**
   * Query the selectorAll under the current node and
   * returns the selections encapsulated in a new Node instance.
   * The returned Node instance shares the root node and DOM
   * tree from this one.
   *
   * @param {*} selector
   * @returns {Node} returns the new Node instance encapsulating
   *  the selected nodes.
   *
   */
  find(selector) {
    const matched = this.$(this.context).find(selector);
    const node = new Node(this.$, this.rootNode, matched);
    this.context = matched.end(); // keep the original contex for the current node
    return node; // returns new Node instance that holds the selections as context
  }

  /**
   * Returns the new Node instance that selects the first element
   * of current selections (or context).
   *
   * @returns {Node} the new Node instance with the first element
   *  selected as the context.
   */
  first() {
    return new Node(this.$, this.rootNode, this.context.first());
  }

  /**
   * Retrieve the ith element from the current context.
   * 
   * @param {number} ith the index of current selections.
   * @returns {Node} the new Node instance with the retrieved 
   *  element set as the context.
   */
  get(ith) {
    // Cheerio.get() does not return Cheerio object.  Wrap it with $().
    return new Node(this.$, this.rootNode, this.$(this.context.get(ith)));
  }

  /**
   * Gets the attribute of this node.
   * Only the first element of the attribute in the
   * current node set is returned.
   * 
   * @param {string} attrName 
   * @returns {string} the attribute name
   */
  getAttr(attrName) {
    return this.context.attr(attrName);
  }

  /**
   * Check to see if `this` node has the given className.
   * @param {String} className 
   * @returns {boolean}
   */
  hasClass(className) {
    return this.context.hasClass(className);
  }

  html() {
    return this.$(this.context).html();
  }

  /**
   * Inserts the copy of this node after the given node and returns
   * the target node where this node is inserted after.  This method
   * will modify the DOM tree where the target node belongs to.
   * 
   * Note that this method returns the target node.  If you want
   * the inserted node to be returned, use the corresponding static
   * method: `insertHtmlAfter(html, targetNode)`
   *
   * @param {Node} targetNode The target node where `this` node is
   *  inserted to after.  The `this` node's context is unmodified.
   * @returns {Node} the target node, i.e. the passed argument,
   *  where `this` node is inserted after the target.
   */
  insertMeAfter$(targetNode) {
    targetNode.$(this.html()).insertAfter(targetNode.context);
    return targetNode;
  }

  /**
   * Inserts the copy of this node before the given node and returns
   * the target node where `this` node is inserted before.  This method
   * will modify the DOM tree where the target node belongs to.
   *
   * Note that this method returns the target node.  If you want
   * the inserted node to be returned, use the corresponding static
   * method: `insertHtmlBefore(html, targetNode)`.
   *
   * @param {Node} targetNode The target node where `this` node is
   *  inserted to before.  The `this` node's context is unmodified.
   * @returns {Node} the target node, i.e. the given parameter,
   *  where `this` node is inserted before the target.
   */
  insertMeBefore$(targetNode) {
    targetNode.$(this.html()).insertBefore(targetNode.context);
    return targetNode;
  }

  /**
   * Returns the new Node instance with the current context
   * (or the selection)set to the next node within the siblings.
   * If there is not more next siblings, the current context
   * is the cheerio object with zero selection.
   *
   * The new Node instance shares the root node with `this` object.
   * The `this` object's context (or the selection) is unchanged.
   *
   * @returns {Node} returns the new Node instance with the current
   *  context set to the next sibling node.
   */
  next() {
    // this.context.next() does not change the current selection
    // this.context.next() returns the new cheerio instance with
    // next node selected
    return new Node(this.$, this.rootNode, this.context.next());
  }

  /**
   * Returns the new Node instance of this parent.
   */
  parent() {
    return new Node(this.$, this.rootNode, this.context.parent());
  }

  /**
   * Returns the new Node instance with the current context
   * (or the selection)set to the previous node within the siblings.
   * If there is not more previous siblings, the current context
   * is the cheerio object with zero selection.
   * 
   * The new Node instance shares the root node with `this` object.
   * The `this` object's context (or the selection) is unchanged.
   * 
   * @returns {Node} returns the new Node instance with the current
   *  context set to the previous sibling node.
   */
  prev() {
    // this.context.prev() does not change the current selection
    // this.context.prev() returns the new cheerio instance with
    // the previous node selected
    return new Node(this.$, this.rootNode, this.context.prev());
  }

  /**
   * Removes the selections given in the parameter under the current
   * node and returns `this` Node instance.
   * 
   * Note that if given `selector` points itself, the returned Node
   * instance holds removed elements.
   *
   * @param {String} selector CSS selector to match the removing nodes.
   * @returns {this} `this` Node instance.
   */
  remove$(selector) {
    this.context.find(selector).remove().end();
    return this;
  }

  /**
   * Replaces the current selections with the given HTML
   * string and returns the replaced node as a current
   * current selection.
   *
   * @param {String} html The replacing HTML string.
   * @returns {Node} the new Node instance with the root node
   *  set as a current context.
   */
  replaceWithHTML$(html) {
    const rep = this.$(html);
    this.context.replaceWith(html);
    return new Node(this.$, this.rootNode, this.rootNode);
  }

  root() {
    return new Node(this.$, this.rootNode, this.rootNode);
  }

  /**
   * Sets the attribute of this node and returns `this` node.
   *
   * @param {string} attrName 
   * @param {string} value 
   * @returns {Node} returns `this` Node instance for the method chain.
   */
  setAttr$(attrName, value) {
    this.context.attr(attrName, value);
    return this;
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
