# v8-to-istanbul

[![Build Status](https://travis-ci.org/istanbuljs/v8-to-istanbul.svg?branch=master)](https://travis-ci.org/istanbuljs/v8-to-istanbul)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Coverage Status](https://coveralls.io/repos/github/istanbuljs/v8-to-istanbul/badge.svg?branch=master)](https://coveralls.io/github/istanbuljs/v8-to-istanbul?branch=master)

converts from v8 coverage format to [istanbul's coverage format](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md).

## Usage

```js
const v8toIstanbul = require('v8-to-istanbul')
// create a script object from a source-file. the source file
// is loaded from disk and this is used to determine the original
// line count.
const script = v8toIstanbul('./path-to-instrumented-file.js')
// provide an array of coverage information in v8 format.
script.applyCoverage([
  {
    "functionName": "",
    "ranges": [
      {
        "startOffset": 0,
        "endOffset": 520,
        "count": 1
      }
    ],
    "isBlockCoverage": true
  },
  // ...
])
// output coverage information in a form that can
// be consumed by Istanbul.
console.info(JSON.stringify(script.toIstanbul()))
```

## Testing

To execute tests, simply run:

```bash
npm test
```
