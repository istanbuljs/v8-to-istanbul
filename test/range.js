/* global describe, it */
const { sliceRange } = require('../lib/range')

require('tap').mochaGlobals()
require('should')

describe('range', () => {
  describe('slice range', () => {
    it('can deal with empty arrays', () => {
      sliceRange([], 0, 1).should.eql([])
    })
    it('can find lines that match exactly', () => {
      const THREE_LINES = [
        { startCol: 0, endCol: 10 },
        { startCol: 11, endCol: 20 },
        { startCol: 21, endCol: 30 }
      ]
      sliceRange(THREE_LINES, 0, 10).should.eql([THREE_LINES[0]])
      sliceRange(THREE_LINES, 11, 20).should.eql([THREE_LINES[1]])
      sliceRange(THREE_LINES, 21, 30).should.eql([THREE_LINES[2]])
    })
    it('can cover a range that spans two lines', () => {
      const SIX_LINES = [
        { startCol: 0, endCol: 3 },
        { startCol: 4, endCol: 10 },
        { startCol: 11, endCol: 14 },
        { startCol: 15, endCol: 20 },
        { startCol: 21, endCol: 24 },
        { startCol: 25, endCol: 30 }
      ]
      sliceRange(SIX_LINES, 5, 14).should.eql(SIX_LINES.slice(1, 3))
      sliceRange(SIX_LINES, 15, 22).should.eql(SIX_LINES.slice(3, 5))
    })
    it('exclusive/inclusive ranges', () => {
      const SIX_LINES = [
        { startCol: 0, endCol: 14 },
        { startCol: 15, endCol: 20 },
        { startCol: 21, endCol: 24 },
        { startCol: 25, endCol: 30 }
      ]
      sliceRange(SIX_LINES, 20, 24).should.eql([])
      sliceRange(SIX_LINES, 20, 24, true).should.eql(SIX_LINES.slice(1, 3))
      sliceRange(SIX_LINES, 21, 25).should.eql(SIX_LINES.slice(2, 3))
    })
  })
})
