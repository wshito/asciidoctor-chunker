/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import * as cheerio from 'cheerio';
/*
 * Module to provide the functional utils to manipulate DOM
 * with CheerioJS.  The name of function that causes
 * side effects has $ at the end.
 */


/**
 * Invokes find() method on `node` and returns the same `node`
 * with the current context is set with the selected nodes.
 * Note this function changes the state of `node` argument, thus
 * has side effects.
 *
 * @param {string} selector The css selector
 * @param {Cheerio} node The Cheerio instance with DOM
 * @param Returns Cheerio instance with the selected node set
 *   as a current context.
 */
export const find$ = selector => node => node.find(selector);

/**
 * Makes a clone and returns it.
 * 
 * @param {CheerioAPI} node 
 */
export const clone = node => node.clone();

/**
 * Appends nodes sequently to the target node.
 * This causes side effects that change the state of the target node.  The appending nodes are cloned and untouched.
 * 
 * @param {Cheerio} target The target node where nodes are appended to.
 * @param {[Cheerio<Element>]} nodes The array of appending nodes.
 *  These nodes are cloned before appending.
 */
export const append$ = (...appendingNodes) => target => {
  appendingNodes.forEach(ele => target.append(ele.cloneNode()));
  return target.end();
}

/**
 * Returns a newly created DOM which all the matched
 * nodes are removed.
 *
 * @param {string} selector CSS selector to match the removing
 *  nodes.
 * @param {Cheerio} node The dom of Cheerio instance.
 *  This function clones this node before modifying.
 * @returns The newly created Cheerio instance with matched
 *  nodes removed.
 */
export const remove = selector => node =>
  node.clone().find(selector).remove().end();

/**
 * Returns a newly created DOM of which the children
 * of the matched node are removed.
 *
 * @param {string} selector CSS selector to match the removing
 *  nodes.
 * @param {Cheerio} node The dom of Cheerio instance.
 *  This function clones this node before modifying.
 * @returns The newly created Cheerio instance with matched
 *  node is emptied out.
 */
export const empty = selector => node =>
  node.clone().find(selector).empty().end();
