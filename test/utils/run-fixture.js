/* global describe, it */

const toIstanbul = require('../../')
const t = require('tap')

t.mochaGlobals()
require('should')

module.exports = async (fixture) => {
  const script = toIstanbul(fixture.coverageV8.url)
  await script.load()
  script.applyCoverage(fixture.coverageV8.functions)

  let coverageIstanbul = script.toIstanbul()
  // the top level object is keyed on filename, grab the inner
  // object which is easier to assert against.
  let path = Object.keys(coverageIstanbul)[0]
  coverageIstanbul = coverageIstanbul[path]

  describe(fixture.describe, () => {
    it('matches snapshot: ', () => {
      t.matchSnapshot(coverageIstanbul)
    })
  })
}
