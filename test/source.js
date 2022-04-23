/* global describe, it */

const CovSource = require('../lib/source')
const { TraceMap } = require('@jridgewell/trace-mapping')

require('tap').mochaGlobals()
require('should')

describe('Source', () => {
  describe('relativeToOffset', () => {
    it('returns an offset in the middle of a file', () => {
      const sourceRaw = `const a = 99
        const b = 33
        for (var i = 0; i < 99; i++) {
          console.info('hello world')
        }
        return a`
      const source = new CovSource(sourceRaw, 0)
      source.relativeToOffset(3, 8).should.equal(42)
    })

    it('returns EOF if line is greater than lines in file', () => {
      const sourceRaw = `
        const a = 99`
      const source = new CovSource(sourceRaw, 0)
      source.relativeToOffset(5, 8).should.equal(21)
    })

    it('returns end of line, if column offset greater than line length', () => {
      const sourceRaw = `a
        const a = 99`
      const source = new CovSource(sourceRaw, 0)
      source.relativeToOffset(2, 50).should.equal(22)
      source.relativeToOffset(1, Infinity).should.equal(1)
    })

    it('returns empty object for out of range params', () => {
      const sourceRaw = ''
      const source = new CovSource(sourceRaw, 0)
      source.offsetToOriginalRelative(undefined, Infinity, Infinity).should.deepEqual({})
    })

    it('accepts null', () => {
      const sourceRaw = null
      new CovSource(sourceRaw, 0).should.ok()
    })

    it('range crossing two sourcemaps', () => {
      const sourceRaw = `\
(() => {
  // hello.ts
  function hello() {
    console.log("hello world");
  }

  // greet.ts
  hello();
})();
//# sourceMappingURL=greet.js.map\
`
      const source = new CovSource(sourceRaw, 0)
      const sourceMap = new TraceMap({
        version: 3,
        sources: ['../hello.ts', '../greet.ts'],
        sourcesContent: ['export function hello() {\r\n  console.log("hello world")\r\n}', 'import {hello} from "./hello"\r\n\r\nhello()\r\n'],
        mappings: ';;AAAO,mBAAiB;AACtB,YAAQ,IAAI;AAAA;;;ACCd;',
        names: []
      })
      source.offsetToOriginalRelative(sourceMap, 25, 97).should.deepEqual({})
    })
  })

  describe('ignore', () => {
    it('ignores the next line if /* c8 ignore next */ is on its own line', () => {
      const sourceRaw = `
      const a = 33
      /* c8 ignore next */
      const a = 99
      `
      const source = new CovSource(sourceRaw, 0)
      source.lines[1].ignore.should.equal(false)
      source.lines[2].ignore.should.equal(true)
      source.lines[3].ignore.should.equal(true)
    })

    it('ignores the next N lines if /* c8 ignore next N */ is used', () => {
      const sourceRaw = `
      /* c8 ignore next 2 */
      const a = 33
      const a = 99
      `
      const source = new CovSource(sourceRaw, 0)
      source.lines[1].ignore.should.equal(true)
      source.lines[2].ignore.should.equal(true)
      source.lines[3].ignore.should.equal(true)
    })

    it('ignores a line that contains /* c8 ignore next */', () => {
      const sourceRaw = `
      const a = foo ? true /* c8 ignore next */ : false
      const b = 99
      `
      const source = new CovSource(sourceRaw, 0)
      source.lines[1].ignore.should.equal(true)
      source.lines[2].ignore.should.equal(false)
    })

    it('ignores lines between start and stop', () => {
      const sourceRaw = `
      /* c8 ignore start */
      function ignoreMe() {
        // ...
      }
      /* c8 ignore stop */

      function doNotIgnoreMe() {
        // ...
      }
      `
      const source = new CovSource(sourceRaw, 0)
      source.lines[1].ignore.should.equal(true)
      source.lines[2].ignore.should.equal(true)
      source.lines[3].ignore.should.equal(true)
      source.lines[4].ignore.should.equal(true)
      source.lines[5].ignore.should.equal(true)
      source.lines[6].ignore.should.equal(false)
      source.lines[7].ignore.should.equal(false)
      source.lines[8].ignore.should.equal(false)
      source.lines[9].ignore.should.equal(false)
    })
  })
})
