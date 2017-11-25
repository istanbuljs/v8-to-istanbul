/* global describe, it */

const toIstanbul = require('../../')

require('chai').should()

module.exports = (fixture) => {
  describe(fixture.describe, () => {
    fixture.assertions.forEach(assertion => {
      describe(assertion.describe, () => {
        const script = toIstanbul(fixture.coverageV8.url)
        script.applyCoverage(fixture.coverageV8.functions)
        let coverageIstanbul = script.toIstanbul()

        // run with DEBUG=true to output coverage information to
        // terminal; this is useful when writing new tests.
        if (process.env.DEBUG === 'true') {
          console.info('------------------')
          console.info(JSON.stringify(coverageIstanbul, null, 2))
          console.info('------------------')
        }

        // the top level object is keyed on filename, grab the inner
        // object which is easier to assert against.
        coverageIstanbul = coverageIstanbul[Object.keys(coverageIstanbul)[0]]

        it('has appropriate line coverage', () => {
          ;(assertion.lines || []).forEach(expectedLine => {
            assertLine(coverageIstanbul, expectedLine)
          })
        })

        it('has appropriate branch coverage', () => {
          ;(assertion.branches || []).forEach(expectedBranch => {
            assertBranch(coverageIstanbul, expectedBranch)
          })
        })
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
  // let started = false
  // let start = expectedBranch.startLine
  /*
  Object.keys(coverageIstanbul.statementMap).forEach(key => {
    if (start > expectedLine.endLine) return
    const observedLine = coverageIstanbul.statementMap[key]
    if (observedLine.start.line === expectedLine.startLine) {
      started = true
    }
    if (started) {
      start.should.equal(observedLine.start.line)
      coverageIstanbul.s[key].should.equal(expectedLine.count)
      start += 1
    }
  })
  */
}
