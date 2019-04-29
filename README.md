# v8-to-istanbul

[![Build Status](https://travis-ci.org/istanbuljs/v8-to-istanbul.svg?branch=master)](https://travis-ci.org/istanbuljs/v8-to-istanbul)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Coverage Status](https://coveralls.io/repos/github/istanbuljs/v8-to-istanbul/badge.svg?branch=master)](https://coveralls.io/github/istanbuljs/v8-to-istanbul?branch=master)

converts from v8 coverage format to [istanbul's coverage format](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md).

## Usage

```js
const v8toIstanbul = require('v8-to-istanbul')
// the path to the original source-file is required, as its contents are
// used during the conversion algorithm.
const converter = v8toIstanbul('./path-to-instrumented-file.js')
await converter.load() // this is required due to the async source-map dependency.
// provide an array of coverage information in v8 format.
converter.applyCoverage([
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
console.info(JSON.stringify(converter.toIstanbul()))
```

## Testing

To execute tests, simply run:

```bash
npm test
```
