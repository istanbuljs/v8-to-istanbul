/* global describe, it */

const CovSource = require('../lib/source')

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
  })
})
