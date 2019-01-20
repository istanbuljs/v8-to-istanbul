const assert = require('assert')
const fs = require('fs')
const CovBranch = require('./branch')
const CovLine = require('./line')
const CovFunction = require('./function')

// Injected when Node.js is loading script into isolate.
// see: https://github.com/nodejs/node/pull/21573.
const cjsWrapperLength = require('module').wrapper[0].length

const isWindows = process.platform === 'win32'

module.exports = class CovScript {
  constructor (scriptPath, wrapperLength) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    const path = parsePath(scriptPath)
    const source = fs.readFileSync(path, 'utf8')
    this.path = path
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.lines = []
    this.branches = []
    this.functions = []
    this.eof = -1
    this._buildLines(source, this.lines)
  }
  _buildLines (source, lines) {
    let position = 0
    const separator = isWindows ? '\r\n' : '\n'
    source.split(separator).forEach((lineStr, i) => {
      this.eof = position + lineStr.length
      lines.push(new CovLine(i + 1, position, this.eof))
      position += lineStr.length + separator.length
    })
  }
  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const startCol = Math.max(0, range.startOffset - this.wrapperLength)
        const endCol = Math.min(this.eof, range.endOffset - this.wrapperLength)
        const lines = this.lines.filter(line => {
          return startCol <= line.endCol && endCol >= line.startCol
        })

        if (block.isBlockCoverage && lines.length) {
          // record branches.
          this.branches.push(new CovBranch(
            lines[0],
            startCol,
            lines[lines.length - 1],
            endCol,
            range.count
          ))

          // if block-level granularity is enabled, we we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            this.functions.push(new CovFunction(
              block.functionName,
              lines[0],
              startCol,
              lines[lines.length - 1],
              endCol,
              range.count
            ))
          }
        } else if (block.functionName && lines.length) {
          // record functions.
          this.functions.push(new CovFunction(
            block.functionName,
            lines[0],
            startCol,
            lines[lines.length - 1],
            endCol,
            range.count
          ))
        }

        // record the lines (we record these as statements, such that we're
        // compatible with Istanbul 2.0).
        lines.forEach(line => {
          // make sure branch spans entire line; don't record 'goodbye'
          // branch in `const foo = true ? 'hello' : 'goodbye'` as a
          // 0 for line coverage.
          if (startCol <= line.startCol && endCol >= line.endCol) {
            line.count = range.count
          }
        })
      })
    })
  }
  toIstanbul () {
    const istanbulInner = Object.assign(
      { path: this.path },
      this._statementsToIstanbul(),
      this._branchesToIstanbul(),
      this._functionsToIstanbul()
    )
    const istanbulOuter = {}
    istanbulOuter[this.path] = istanbulInner
    return istanbulOuter
  }
  _statementsToIstanbul () {
    const statements = {
      statementMap: {},
      s: {}
    }
    this.lines.forEach((line, index) => {
      statements.statementMap[`${index}`] = line.toIstanbul()
      statements.s[`${index}`] = line.count
    })
    return statements
  }
  _branchesToIstanbul () {
    const branches = {
      branchMap: {},
      b: {}
    }
    this.branches.forEach((branch, index) => {
      branches.branchMap[`${index}`] = branch.toIstanbul()
      branches.b[`${index}`] = [branch.count]
    })
    return branches
  }
  _functionsToIstanbul () {
    const functions = {
      fnMap: {},
      f: {}
    }
    this.functions.forEach((fn, index) => {
      functions.fnMap[`${index}`] = fn.toIstanbul()
      functions.f[`${index}`] = fn.count
    })
    return functions
  }
}

function parsePath (scriptPath) {
  return scriptPath.replace('file://', '')
}
