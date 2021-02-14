/*
 * This file is a part of Asciidoctor Chunker project.
 * Copyright (c) 2021 Wataru Shito (@waterloo_jp)
 */
'use strict';

export const pipe = (...funcs) => (...args) => {
  let newArgs = args;
  for (let i = 0; i < funcs.length; i++)
    newArgs = [funcs[i].apply(this, newArgs)];
  return newArgs[0];
}

export const compose = (...funcs) => (...args) => {
  let newArgs = args;
  for (let i = funcs.length - 1; i > -1; i--)
    newArgs = [funcs[i].apply(this, newArgs)];
  return newArgs[0];
}
