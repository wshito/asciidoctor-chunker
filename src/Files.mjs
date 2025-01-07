/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import Node from './Node.mjs';
import path, { relative } from 'path';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
// import { access, copyFile, mkdir, rm, stat } from 'node:fs/promises';

/**
 * Asynchronously make directory recursively as `mkdir -p`
 * and returns the given path string for the use of
 * method chain when resolved.
 *
 * @param {string} path
 */
export const mkdirs = (path) =>
  fsp.mkdir(path, { recursive: true }).then(
    onfulfilled => path,
    onrejected => onrejected);

/**
 * Returns true if source is newer (modified) than
 * target.
 *
 * @param {string} source path to the source file
 * @param {string} target path to the tage file
 */
export const sourceIsNewerThan = (source) =>
  (target) => {
    return Promise.allSettled(
      [fsp.stat(source), fsp.stat(target)])
      // .then(res => { console.log(res); return res })
      .then(([src, targ]) =>
        targ.status === 'rejected' || // targ not existed
        src.value.mtimeMs > targ.value.mtimeMs
      );
  };

/**
 * Copies the source file to the target file if the
 * source is newer than the taget and returns the
 * target's path when resolved.
 *
 * If the target does not exists, this will copy.
 * If the directories containing the target does
 * not exist, this will create all the directories
 * recursively.
 *
 * @param {string} source path to the source file
 * @param {string} target path to the target file
 * @returns target's path when copied, error when failed to copy,
 *  false if target is newer and was not copied.
 */
export const copyIfNewer = (source) => async (target) => {
  // make target file path
  if (await sourceIsNewerThan(source)(target)) {
    const dir = path.dirname(target);
    if (!await exists(dir))
      await mkdirs(dir);
    return fsp.copyFile(source, target).then(onfulfilled => target);
  } else
    return false;
};

/**
 * Converts a relative path to the absolute where the relative
 * path is based on the `basefile` location.  The main usage
 * of this function is to convert the relative path of
 * included files in the HTML file (basefile) to the absolute
 * path.
 *
 * @param {string} basefile path of basefile which is the base
 *  location for the relative path of `relativePathFromBasefile`.
 * @param {string} relativePathFromBasefile the relative path
 *  of a file from the basefile location.
 */
export const relative2absolute = (basefile) =>
  (relativePathFromBasefile) => {
    const baseDir = path.dirname(basefile);
    return path.join(baseDir, relativePathFromBasefile);
  };

/**
 * Asynchronously returns true if the file
 * or dir exists.
 * 
 * @param {string} path
 * @returns Promoise that returns true if file
 *  or dir exists.  Returns false if not existed
 *  or promise rejected.
 */
export const exists = (path) =>
  fsp.access(path, fs.constants.F_OK).then(
    onfullfilled => true,
    onrejected => false);

/**
 * Asyncronously removes recursively forcefully
 * as `rm -rf`.
 *
 * @param {string} path 
 * @returns Promise that returns removed path when
 *  resolved and error object when rejected.
 */
export const rm = (path) => fsp.rm(path, { force: true, recursive: true }).then(
  onfulfilled => path,
  onrejected => onrejected);

// exporting only for unit testing
export const _removeParameters = (url) => {
  const base = path.basename(url);
  const i = base.indexOf('?');
  return i === -1 ? url :
    path.join(path.dirname(url), base.substring(0, i));
}

const notRelative = /^#|^https:|^http:|^file:|^data:/;

/**
 * Extracts relative paths from tagName[attrName] elements
 * under the given dom node.
 *
 * @param {Node} node The instance of DOM node.
 */
export const getLocalFiles = (node) => {
  const localFiles = [];
  node.find(`link[href], script[src], img[src]`).each((ele, i) => {
    const url = ele.getAttr('href') || ele.getAttr('src');
    if (!url.match(notRelative) && !path.isAbsolute(url)) {
      localFiles.push(_removeParameters(url));
    }
  });
  return localFiles;
};

export const copyRelativeFiles = (basefile, outDir) => (node) => {
  const toAbsoluteInOutDir = (relativeFile) => path.join(outDir, relativeFile);
  const toAbsoluteInSrcDir = relative2absolute(basefile);

  getLocalFiles(node).forEach(file =>
    copyIfNewer(toAbsoluteInSrcDir(file))
      (toAbsoluteInOutDir(file)).catch(e => console.log(`    Local file linked from the document is missing: ${toAbsoluteInSrcDir(file)}`)));
};
