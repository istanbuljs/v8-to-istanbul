/* global describe, it */

const { readdirSync, lstatSync } = require('fs')
const path = require('path')
const runFixture = require('./utils/run-fixture')
const Script = require('../lib/script')

require('tap').mochaGlobals()
require('should')

describe('Script', () => {
  describe('constructor', () => {
    it('creates line instance for each line in script', async () => {
      const script = new Script(
        require.resolve('./fixtures/scripts/functions.js')
      )
      await script.load()
      script.lines.length.should.equal(48)
      script.wrapperLength.should.equal(0) // common-js header.
    })

    it('handles ESM style paths', async () => {
      const script = new Script(
        `file://${require.resolve('./fixtures/scripts/functions.js')}`,
        0
      )
      await script.load()
      script.lines.length.should.equal(48)
      script.wrapperLength.should.equal(0) // ESM header.
    })
  })

  // execute JavaScript files in fixtures directory; these
  // files contain the raw v8 output along with a set of
  // assertions. the original scripts can be found in the
  // fixtures/scripts folder.
  const fixtureRoot = path.resolve(__dirname, './fixtures')
  readdirSync(fixtureRoot).forEach(file => {
    const fixturePath = path.resolve(fixtureRoot, file)
    const stats = lstatSync(fixturePath)
    if (stats.isFile()) {
      const fixture = require(fixturePath)
      runFixture(fixture)
    }
  })
})
