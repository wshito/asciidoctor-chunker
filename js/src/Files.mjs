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
