/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import path, { relative } from 'path';
import fs from 'fs';
const fsp = fs.promises;
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
 * source.
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
        src.value.atimeMs > targ.value.atimeMs
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
