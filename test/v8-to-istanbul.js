/* global describe, it, beforeEach, afterEach */
const { readdirSync, lstatSync, writeFileSync, readFileSync } = require('fs')
const path = require('path')
const runFixture = require('./utils/run-fixture')
const V8ToIstanbul = require('../lib/v8-to-istanbul')
const crypto = require('crypto')
const os = require('os')
const sourcemap = require('source-map')
const assert = require('assert')

require('tap').mochaGlobals()
require('should')

describe('V8ToIstanbul', async () => {
  describe('constructor', () => {
    it('creates line instance for each line in V8ToIstanbul', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        require.resolve('./fixtures/scripts/functions.js')
      )
      await v8ToIstanbul.load()
      v8ToIstanbul.covSources[0].source.lines.length.should.equal(48)
      v8ToIstanbul.covSources.length.should.equal(1)
      v8ToIstanbul.wrapperLength.should.equal(0) // common-js header.
    })

    it('handles ESM style paths', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/functions.js')}`,
        0
      )
      await v8ToIstanbul.load()
      v8ToIstanbul.covSources[0].source.lines.length.should.equal(48)
      v8ToIstanbul.covSources.length.should.equal(1)
      v8ToIstanbul.wrapperLength.should.equal(0) // ESM header.
    })

    it('handles source maps with sourceRoot', async () => {
      const sourceFileName = 'sourcemap-source.js'
      const sourceRoot = path.dirname(require.resolve(`./fixtures/scripts/${sourceFileName}`))
      const absoluteSourceFilePath = path.join(sourceRoot, sourceFileName)
      const map = new sourcemap.SourceMapGenerator({
        file: sourceFileName,
        sourceRoot
      })
      map.addMapping({
        source: sourceFileName,
        original: { line: 1, column: 1 },
        generated: { line: 1, column: 1 }
      })
      map.setSourceContent(sourceFileName, readFileSync(absoluteSourceFilePath).toString())
      const base64Sourcemap = Buffer.from(map.toString()).toString('base64')
      const source = `const foo = "bar";
${'//'}${'#'} sourceMappingURL=data:application/json;base64,${base64Sourcemap}
`
      const tmpPath = path.join(os.tmpdir(), crypto.randomBytes(4).readUInt32LE(0) + '.js')
      writeFileSync(tmpPath, source)

      const v8ToIstanbul = new V8ToIstanbul(tmpPath)
      await v8ToIstanbul.load()

      v8ToIstanbul.path.should.equal(absoluteSourceFilePath)
    })

    it('handles sourceContent', async () => {
      const sourceFileName = 'sourcemap-source.js'
      const sourceRoot = path.dirname(require.resolve(`./fixtures/scripts/${sourceFileName}`))
      const absoluteSourceFilePath = path.join(sourceRoot, sourceFileName)
      const map = new sourcemap.SourceMapGenerator({
        file: sourceFileName
      })
      map.addMapping({
        original: { line: 1, column: 1 },
        generated: { line: 1, column: 1 },
        source: sourceFileName
      })
      map.setSourceContent(sourceFileName, readFileSync(absoluteSourceFilePath).toString())

      const source = 'const foo = "bar";'
      const tmpPath = path.join(os.tmpdir(), crypto.randomBytes(4).readUInt32LE(0) + '.js')
      writeFileSync(tmpPath, source)

      const sources = {
        sourceMap: {
          sourcemap: map.toJSON()
        }
      }
      const v8ToIstanbul = new V8ToIstanbul(tmpPath, undefined, sources)
      await v8ToIstanbul.load()

      // if the source is transpiled and since we didn't inline the source map into the transpiled source file
      // that means it was bale to access the content via the provided sources object
      v8ToIstanbul.sourceTranspiled.should.not.be.undefined()
    })

    it('should clamp line source column >= 0', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/needs-compile.compiled.js')}`,
        0
      )

      // read the file and find the first end of line char
      const fileBody = readFileSync(require.resolve('./fixtures/scripts/needs-compile.compiled.js')).toString()
      const matchedNewLineChar = fileBody.match(/(?<=\r?\n)/u).index

      // this isn't an assertion for the test so much as it is an assertion that the
      // test fixture hasn't be reverted from \r\n to \n.
      assert(fileBody.substring(matchedNewLineChar - 2, matchedNewLineChar) === '\r\n', 'The test fixture is misconfigured!')

      await v8ToIstanbul.load()
      // apply a fake range that starts with the matched new line
      // (these ranges can occur on v8 running on windows) and verify
      // coverage is applied correctly. CovLine will have a
      // gap between the endCol of the previous line ending on \r and startCol of the
      // next line. This would cause -1 to be sent for the source map lookup.
      // This would cause source map translation to throw
      v8ToIstanbul.applyCoverage([{
        functionName: 'fake',
        ranges: [{
          startOffset: matchedNewLineChar - 1,
          endOffset: matchedNewLineChar + 10
        }]
      }])
    })

    it('should exclude files when passing excludePath', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/sourcemap-multisource.js')}`,
        0,
        undefined,
        path => path.indexOf('bootstrap') > -1
      )
      await v8ToIstanbul.load()
      v8ToIstanbul.applyCoverage([{
        functionName: 'fake',
        ranges: [{
          startOffset: 0,
          endOffset: 1
        }]
      }])
      Object.keys(v8ToIstanbul.toIstanbul()).should.eql(['webpack:///src/index.ts', 'webpack:///src/utils.ts'])
    })
  })
  
  describe('source map format edge cases', () => {
    let consoleWarn
    beforeEach(() => {
      consoleWarn = console.warn
      console.warn = () => { throw new Error('Test should not invoke console.warn') }
    })
    afterEach(() => {
      console.warn = consoleWarn
    })
    it('should handle empty sources in a sourcemap', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/empty.compiled.js')}`,
        0
      )
      await v8ToIstanbul.load()
    })

    it('should handle relative sourceRoots correctly', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/relative-source-root.compiled.js')}`,
        0
      )
      await v8ToIstanbul.load()
      assert(v8ToIstanbul.path.includes('v8-to-istanbul/test/fixtures/one-up/relative-source-root.js'))
    })

    it('should handles source maps with moultiple sources', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/sourcemap-multisource.js')}`,
        0
      )
      await v8ToIstanbul.load()

      v8ToIstanbul.covSources.length.should.equal(3)
      Object.keys(v8ToIstanbul.toIstanbul()).should.eql(['webpack:///webpack/bootstrap', 'webpack:///src/index.ts', 'webpack:///src/utils.ts'])
    })
  })

  // execute JavaScript files in fixtures directory; these
  // files contain the raw v8 output along with a set of
  // assertions. the original scripts can be found in the
  // fixtures/scripts folder.
  const fixtureRoot = path.resolve(__dirname, './fixtures')
  for (const file of readdirSync(fixtureRoot)) {
    const fixturePath = path.resolve(fixtureRoot, file)
    const stats = lstatSync(fixturePath)
    if (stats.isFile()) {
      const fixture = require(fixturePath)
      await runFixture(fixture)
    }
  }
})
