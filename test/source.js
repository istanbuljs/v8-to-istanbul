/* global describe, it */

const CovSource = require('../lib/source')
const { TraceMap } = require('@jridgewell/trace-mapping')
const assert = require('assert')

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

    it('ignores empty lines', () => {
      const sourceRaw = `\
function add(a: number, b: number) {
  /**
   * Multi
   * line
   * comment
   */
  if (a === 2 && b === 3) {
    // This line should NOT be covered
    return 5;
  }

  type TypescriptTypings = 1 | 2;

  if (a === 1 && b === 1) {
    // Comment
    return 2;
  }

  interface MoreCompileTimeCode {
    should: {
      be: {
        excluded: true;
      };
    };
  }

  return a + b;
}

add(2, 5);
`
      const sourceMap = new TraceMap({
        version: 3,
        file: 'index.js',
        sourceRoot: '',
        sources: [
          '../src/index.ts'
        ],
        names: [],
        mappings: ';AAAA,SAAS,GAAG,CAAC,CAAS,EAAE,CAAS;IAM/B,IAAI,CAAC,KAAK,CAAC,IAAI,CAAC,KAAK,CAAC,EAAE,CAAC;QAEvB,OAAO,CAAC,CAAC;IACX,CAAC;IAID,IAAI,CAAC,KAAK,CAAC,IAAI,CAAC,KAAK,CAAC,EAAE,CAAC;QAEvB,OAAO,CAAC,CAAC;IACX,CAAC;IAUD,OAAO,CAAC,GAAG,CAAC,CAAC;AACf,CAAC;AAED,GAAG,CAAC,CAAC,EAAE,CAAC,CAAC,CAAC'
      }
      )

      const source = new CovSource(sourceRaw, 0, sourceMap)
      const lines = source.lines

      assert.equal(lines[0].ignore, false)

      // Multiline comment
      assert.equal(lines[1].ignore, true)
      assert.equal(lines[2].ignore, true)
      assert.equal(lines[3].ignore, true)
      assert.equal(lines[4].ignore, true)
      assert.equal(lines[5].ignore, true)

      // If-block with inline comment
      assert.equal(lines[6].ignore, false)
      assert.equal(lines[7].ignore, true)
      assert.equal(lines[8].ignore, false)
      assert.equal(lines[9].ignore, false)
      assert.equal(lines[10].ignore, true)

      // Typescript Type
      assert.equal(lines[11].ignore, true)

      // If-block with inline comment
      assert.equal(lines[12].ignore, true)
      assert.equal(lines[13].ignore, false)
      assert.equal(lines[14].ignore, true)
      assert.equal(lines[15].ignore, false)
      assert.equal(lines[16].ignore, false)
      assert.equal(lines[17].ignore, true)

      // Typescript interface
      assert.equal(lines[18].ignore, true)
      assert.equal(lines[19].ignore, true)
      assert.equal(lines[20].ignore, true)
      assert.equal(lines[21].ignore, true)
      assert.equal(lines[22].ignore, true)
      assert.equal(lines[23].ignore, true)
      assert.equal(lines[24].ignore, true)
      assert.equal(lines[25].ignore, true)

      // Return statement + function closing
      assert.equal(lines[26].ignore, false)
      assert.equal(lines[27].ignore, false)

      // Function call
      assert.equal(lines[28].ignore, true)
      assert.equal(lines[29].ignore, false)
    })
  })

  for (const prefix of ['c8', 'v8']) {
    describe(`ignore hint ${prefix}`, () => {
      it(`ignores the next line if /* ${prefix} ignore next */ is on its own line`, () => {
        const sourceRaw = `
        const a = 33
        /* ${prefix} ignore next */
        const a = 99
        `
        const source = new CovSource(sourceRaw, 0)
        source.lines[1].ignore.should.equal(false)
        source.lines[2].ignore.should.equal(true)
        source.lines[3].ignore.should.equal(true)
      })

      it(`ignores the next N lines if /* ${prefix} ignore next N */ is used`, () => {
        const sourceRaw = `
        /* ${prefix} ignore next 2 */
        const a = 33
        const a = 99
        `
        const source = new CovSource(sourceRaw, 0)
        source.lines[1].ignore.should.equal(true)
        source.lines[2].ignore.should.equal(true)
        source.lines[3].ignore.should.equal(true)
      })

      it(`ignores a line that contains /* ${prefix} ignore next */`, () => {
        const sourceRaw = `
        const a = foo ? true /* ${prefix} ignore next */ : false
        const b = 99
        `
        const source = new CovSource(sourceRaw, 0)
        source.lines[1].ignore.should.equal(true)
        source.lines[2].ignore.should.equal(false)
      })

      it('ignores lines between start and stop', () => {
        const sourceRaw = `
        /* ${prefix} ignore start */
        function ignoreMe() {
          // ...
        }
        /* ${prefix} ignore stop */

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

      it('ignore hint accepts other text content', () => {
        const sourceRaw = `
        const a = 33

        /* ${prefix} ignore next -- reasoning why this is ignored */
        const b = 99

        /* ${prefix} ignore start: reasoning here */
        function ignoreMe() {
          // ...
        }
        /* ${prefix} ignore stop -- @preserve */

        const c = a ? true /* ${prefix} ignore next reasoning here */ : false

        /* ${prefix} ignore next 2 -- ignores next two lines */
        const a = 33
        const a = 99
        `
        const source = new CovSource(sourceRaw, 0)
        source.lines[1].ignore.should.equal(false)
        source.lines[2].ignore.should.equal(false)
        source.lines[3].ignore.should.equal(true)
        source.lines[4].ignore.should.equal(true)
        source.lines[5].ignore.should.equal(false)
        source.lines[6].ignore.should.equal(true)
        source.lines[7].ignore.should.equal(true)
        source.lines[8].ignore.should.equal(true)
        source.lines[9].ignore.should.equal(true)
        source.lines[10].ignore.should.equal(true)
        source.lines[11].ignore.should.equal(false)
        source.lines[12].ignore.should.equal(true)
        source.lines[13].ignore.should.equal(false)
        source.lines[14].ignore.should.equal(true)
        source.lines[15].ignore.should.equal(true)
        source.lines[16].ignore.should.equal(true)
      })
    })
  }
})
