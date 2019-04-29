/*
 Copyright 2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

// pulled from: https://github.com/istanbuljs/istanbuljs
'use strict'

const path = require('path')

module.exports = {
  isAbsolute: path.isAbsolute,
  relativeTo (file, origFile) {
    const p = path.isAbsolute(file)
      ? file
      : path.resolve(path.dirname(origFile), file)
    return path.relative(process.cwd(), p)
  }
}
