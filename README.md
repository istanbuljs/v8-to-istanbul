# v8-to-istanbul

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

To output istanbul coverage data while running tests (useful as you add
new assertions), simply run:

```bash
DEBUG=true npm test
```
