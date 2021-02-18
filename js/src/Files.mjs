/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

import fs from 'fs';
const fsp = fs.promises;
/**
 * Make directory recursively as `mkdir -p`
 * and returns the given path string for
 * the use of method chain.
 *
 * @param {string} path 
 */
export const mkdirs = (path) =>
  new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (err) => {
      if (err) reject(err);
      resolve(path);
    });
  });

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
 * Asynchronously returns true if the file
 * or dir exists.
 * 
 * @param {string} path
 * @returns Promoise that returns true if file
 *  or dir exists.  Returns false if not existed
 *  or promise rejected.
 */
export const exists = (path) =>
  new Promise((resolve, reject) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      if (err) resolve(false);
      resolve(true);
    });
  });

/**
 * Asyncronously removes recursively forcefully
 * as `rm -rf`.
 *
 * @param {string} path 
 * @returns Promise that returns nothing when
 *  resolved and error object when rejected.
 */
export const rm = (path) => fsp.rm(path, { force: true, recursive: true });
