const assert = require('assert')
const convertSourceMap = require('convert-source-map')
const CovBranch = require('./branch')
const CovFunction = require('./function')
const CovSource = require('./source')
const { dirname } = require('path')
const { readFileSync } = require('fs')
const { SourceMapConsumer } = require('source-map')

const isNode10 = !!process.version.match(/^v10/)

// Injected when Node.js is loading script into isolate pre Node 11.
// see: https://github.com/nodejs/node/pull/21573.
const cjsWrapperLength = isNode10 ? require('module').wrapper[0].length : 0

module.exports = class V8ToIstanbul {
  constructor (scriptPath, wrapperLength) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    this.path = parsePath(scriptPath)
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.generatedLines = []
    this.branches = []
    this.functions = []
    this.sourceMap = undefined
    this.source = undefined
    this.sourceTranspiled = undefined
  }
  async load () {
    const rawSource = readFileSync(this.path, 'utf8')
    // if we find a source-map (either inline, or a .map file) we load
    // both the transpiled and original source, both of which are used during
    // the backflips we perform to remap absolute to relative positions.
    const rawSourceMap = convertSourceMap.fromSource(rawSource) || convertSourceMap.fromMapFileSource(rawSource, dirname(this.path))
    if (rawSourceMap) {
      this.path = rawSourceMap.sourcemap.sources[0]
      this.sourceMap = await new SourceMapConsumer(rawSourceMap.sourcemap)
      const originalRawSource = readFileSync(this.path, 'utf8')
      this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
      this.source = new CovSource(originalRawSource, this.wrapperLength)
    } else {
      this.source = new CovSource(rawSource, this.wrapperLength)
    }
  }
  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const {
          startCol,
          endCol
        } = this._maybeRemapStartColEndCol(range)

        const lines = this.source.lines.filter(line => {
          return startCol <= line.endCol && endCol >= line.startCol
        })
        const startLineInstance = lines[0]
        const endLineInstance = lines[lines.length - 1]

        if (block.isBlockCoverage && lines.length) {
          // record branches.
          this.branches.push(new CovBranch(
            startLineInstance.line,
            startCol - startLineInstance.startCol,
            endLineInstance.line,
            endCol - endLineInstance.startCol,
            range.count
          ))

          // if block-level granularity is enabled, we we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            this.functions.push(new CovFunction(
              block.functionName,
              startLineInstance.line,
              startCol - startLineInstance.startCol,
              endLineInstance.line,
              endCol - endLineInstance.startCol,
              range.count
            ))
          }
        } else if (block.functionName && lines.length) {
          // record functions.
          this.functions.push(new CovFunction(
            block.functionName,
            startLineInstance.line,
            startCol - startLineInstance.startCol,
            endLineInstance.line,
            endCol - endLineInstance.startCol,
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
  _maybeRemapStartColEndCol (range) {
    let startCol = Math.max(0, range.startOffset - this.source.wrapperLength)
    let endCol = Math.min(this.source.eof, range.endOffset - this.source.wrapperLength)

    if (this.sourceMap) {
      startCol = Math.max(0, range.startOffset - this.sourceTranspiled.wrapperLength)
      endCol = Math.min(this.sourceTranspiled.eof, range.endOffset - this.sourceTranspiled.wrapperLength)
      // given an absolute offset position in the transpiled source code, we
      // remap to line/column positions in the original source.
      const { startLine, relStartCol, endLine, relEndCol } = this.sourceTranspiled.offsetToOriginalRelative(
        this.sourceMap,
        startCol,
        endCol
      )
      // next we convert these relative positions back to absolute positions
      // in the original source (which is the format expected in the next step).
      startCol = this.source.relativeToOffset(startLine, relStartCol)
      endCol = this.source.relativeToOffset(endLine, relEndCol)
    }

    return {
      startCol,
      endCol
    }
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
    this.source.lines.forEach((line, index) => {
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
