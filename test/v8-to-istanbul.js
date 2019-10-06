/* global describe, it */

const { readdirSync, lstatSync, writeFileSync, readFileSync } = require('fs')
const path = require('path')
const runFixture = require('./utils/run-fixture')
const V8ToIstanbul = require('../lib/v8-to-istanbul')
const crypto = require('crypto')
const os = require('os')
const sourcemap = require('source-map')

require('tap').mochaGlobals()
require('should')

describe('V8ToIstanbul', async () => {
  describe('constructor', () => {
    it('creates line instance for each line in V8ToIstanbul', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        require.resolve('./fixtures/scripts/functions.js')
      )
      await v8ToIstanbul.load()
      v8ToIstanbul.source.lines.length.should.equal(48)
      v8ToIstanbul.wrapperLength.should.equal(0) // common-js header.
    })

    it('handles ESM style paths', async () => {
      const v8ToIstanbul = new V8ToIstanbul(
        `file://${require.resolve('./fixtures/scripts/functions.js')}`,
        0
      )
      await v8ToIstanbul.load()
      v8ToIstanbul.source.lines.length.should.equal(48)
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
