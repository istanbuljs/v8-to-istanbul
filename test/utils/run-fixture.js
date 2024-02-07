/* global describe, it */

const toIstanbul = require('../../')
const t = require('tap')
const semver = require('semver')

t.mochaGlobals()
require('should')

module.exports = async (fixture) => {
  const script = toIstanbul(fixture.coverageV8.url)
  await script.load()
  if (fixture.maxNodeVersion && !semver.lt(process.version, fixture.maxNodeVersion)) {
    console.info(`skipping "${fixture.describe}" fixture maxNodeVersion = ${fixture.maxNodeVersion}`)
    return
  }

  script.applyCoverage(fixture.coverageV8.functions)

  let coverageIstanbul = script.toIstanbul()
  // the top level object is keyed on filename, grab the inner
  // object which is easier to assert against.
  coverageIstanbul = coverageIstanbul[Object.keys(coverageIstanbul)[0]]

  describe(fixture.describe, () => {
    it(`matches snapshot ${fixture.describe}`, () => {
      delete coverageIstanbul.path
      t.matchSnapshot(coverageIstanbul, `must match ${fixture.describe} snapshot`)
    })
  })
}
