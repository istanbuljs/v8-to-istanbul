/* global describe, it */

const toIstanbul = require('../../')
const t = require('tap')

t.mochaGlobals()
require('should')

module.exports = (fixture) => {
  const script = toIstanbul(fixture.coverageV8.url)
  script.applyCoverage(fixture.coverageV8.functions)

  let coverageIstanbul = script.toIstanbul()
  // the top level object is keyed on filename, grab the inner
  // object which is easier to assert against.
  coverageIstanbul = coverageIstanbul[Object.keys(coverageIstanbul)[0]]

  describe(fixture.describe, () => {
    // run with DEBUG=true to output coverage information to
    // terminal; this is useful when writing new tests.
    it('outputs debug information', () => {
      t.matchSnapshot(coverageIstanbul)
    })

    fixture.assertions.forEach(assertion => {
      describe(assertion.describe, () => {
        if (assertion.lines) {
          it('has appropriate line coverage', () => {
            assertion.lines.forEach(expectedLine => {
              assertLine(coverageIstanbul, expectedLine)
            })
          })
        }

        if (assertion.branches) {
          it('has appropriate branch coverage', () => {
            assertion.branches.forEach(expectedBranch => {
              assertBranch(coverageIstanbul, expectedBranch)
            })
          })
        }
      })
    })
  })
}

function assertLine (coverageIstanbul, expectedLine) {
  let started = false
  let start = expectedLine.startLine
  const keys = Object.keys(coverageIstanbul.statementMap)
  for (var i = 0, key; (key = keys[i]) !== undefined; i++) {
    if (start > expectedLine.endLine) break
    const observedLine = coverageIstanbul.statementMap[key]
    if (observedLine.start.line === expectedLine.startLine) {
      started = true
    }
    if (started) {
      start.should.equal(observedLine.start.line)
      coverageIstanbul.s[key].should.equal(expectedLine.count)
      start += 1
    }
  }
}

function assertBranch (coverageIstanbul, expectedBranch) {
  let foundMatchingBranch = false
  Object.keys(coverageIstanbul.branchMap).forEach(key => {
    const observedBranch = coverageIstanbul.branchMap[key]
    if (observedBranch.loc.start.line === expectedBranch.startLine &&
      observedBranch.loc.start.column === expectedBranch.startCol &&
      observedBranch.loc.end.line === expectedBranch.endLine &&
      observedBranch.loc.end.line === expectedBranch.endLine) {
      foundMatchingBranch = true
      coverageIstanbul.b[key][0].should.equal(expectedBranch.count)
    }
  })
  foundMatchingBranch.should.equal(true, 'no matching branch found')
}
