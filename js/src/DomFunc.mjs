/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import cheerio from 'cheerio';
/*
 * Module to provide the functional utils to manipulate DOM
 * with CheerioJS.  The name of function that causes side effects
 * has $ at the end.
 */

import { pipe } from './Utils.mjs';
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
 * @param {Cheerio} node 
 */
export const clone = node => node.clone();

/**
 * Appends nodes sequently to the target node.
 * This causes side effects that change the state of the target node.  The appending nodes are cloned and untouched.
 * 
 * @param {Cheerio} target The target node where nodes are appended to.
 * @param {[Cheerio]} nodes The array of appending nodes.
 *  These nodes are cloned before appending.
 */
export const append$ = (...appendingNodes) => target => {
  appendingNodes.forEach(ele => target.append(ele.clone()));
  return target.end();
}

/**
 * Returns the div#content node where all the document
 * contents are appended to.
 * 
 * @param {Cheerio} node The DOM which has #content node.
 */
export const getContentNode$ = node => find$('#content')(node);


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
  cheerio(node.clone().find(selector).empty().end());

/**
 * This function creates a new container with contents
 * appended at #content element.  The contents is also
 * cloned before appending.
 *
 * @param {Cheerio} container The Cheerio instance of DOM which
 *  has #content element to append the contents.  This function
 *  does not touch the passed container.  The container is cloned
 *  and then attach the contents.
 * @param {Cheerio} contents The Cheerio instance of DOM node
 *  to be appended to the container.  The contents are cloned
 *  and then appended.
 * @returns The newly created Cheerio instance of the document
 *  with contents appended.
 */
export const makeDocument = (container, ...contents) =>
  pipe(
    clone,
    getContentNode$,
    append$(...contents)
  )(container);
