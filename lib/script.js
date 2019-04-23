const assert = require('assert')
const convertSourceMap = require('convert-source-map')
const CovBranch = require('./branch')
const CovLine = require('./line')
const CovFunction = require('./function')
const { dirname } = require('path')
const { readFileSync } = require('fs')
const { SourceMapConsumer } = require('source-map')
const { GREATEST_LOWER_BOUND, LOWEST_UPPER_BOUND } = SourceMapConsumer

const isNode10 = !!process.version.match(/^v10/)

// Injected when Node.js is loading script into isolate pre Node 11.
// see: https://github.com/nodejs/node/pull/21573.
const cjsWrapperLength = isNode10 ? require('module').wrapper[0].length : 0

module.exports = class CovScript {
  constructor (scriptPath, wrapperLength) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    this.path = parsePath(scriptPath)
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.lines = []
    this.generatedLines = []
    this.branches = []
    this.functions = []
    this.eof = -1
    this.sourceMap = undefined
  }
  async load () {
    const source = readFileSync(this.path, 'utf8')
    const shebangLength = getShebangLength(source)
    this.wrapperLength -= shebangLength

    // handle both inline and file-based SourceMaps.
    const rawSourceMap = convertSourceMap.fromSource(source) || convertSourceMap.fromMapFileSource(source, dirname(this.path))
    if (rawSourceMap) {
      this.path = rawSourceMap.sourcemap.sources[0]
      
      const originalSource = readFileSync(this.path, 'utf8')
      this.sourceMap = await new SourceMapConsumer(rawSourceMap.sourcemap)

      this.eof = originalSource.trim().length
      this._buildLines(source, this.generatedLines, shebangLength)
      this._buildLines(originalSource, this.lines, shebangLength)
    } else {
      this.eof = source.trim().length
      this._buildLines(source, this.lines, shebangLength)
    }
  }
  _buildLines (source, lines, shebangLength) {
    let position = 0
    for (const [i, lineStr] of source.trim().split(/(?<=\r?\n)/u).entries()) {
      const matchedNewLineChar = lineStr.match(/\r?\n$/u)
      const newLineLength = matchedNewLineChar ? matchedNewLineChar[0].length : 0
      const eol = position + lineStr.length - newLineLength
      const line = new CovLine(i + 1, position, eol)
      if (i === 0 && shebangLength !== 0) line.count = 1
      lines.push(line)
      position += lineStr.length
    }
  }
  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const {
          startLine,
          startCol,
          endLine,
          endCol
        } = this._toLineColumn(range)

        if (block.isBlockCoverage && startLine !== undefined) {
          // record branches.
          console.info(startLine, startCol, endLine, endCol, range.count)
          this.branches.push(new CovBranch(
            startLine,
            startCol,
            endLine,
            endCol,
            range.count
          ))

          // if block-level granularity is enabled, we we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            this.functions.push(new CovFunction(
              startLine,
              startCol,
              endLine,
              endCol,
              range.count
            ))
          }
        } else if (block.functionName && startLine !== undefined) {
          // record functions.
          this.functions.push(new CovFunction(
            startLine,
            startCol,
            endLine,
            endCol,
            range.count
          ))
        }
        
        this.lines.forEach(line => {
          // make sure branch spans entire line; don't record 'goodbye'
          // branch in `const foo = true ? 'hello' : 'goodbye'` as a
          // 0 for line coverage.
          if (line.line >= startLine && line.line <= endLine) {
            if (line.line === startLine) {
              if (line.startCol > startCol) {
                line.count = range.count
              }
            } else if (line.line === endLine) {
              
            } else {
              line.count = range.count
            }
          }
        })
      })
    })
  }
  _toLineColumn (range) {
    let startCol = Math.max(0, range.startOffset - this.wrapperLength)
    let startLine
    let endCol = Math.min(this.eof, range.endOffset - this.wrapperLength)
    let endLine
    const empty = {startLine: undefined, startCol: undefined, endLine: undefined, endCol: undefined}
  
    if (this.sourceMap) {
      const lines = this.generatedLines.filter(line => {
        return startCol <= line.endCol && endCol >= line.startCol
      })
            
      if (!lines.length) return empty

      startLine = lines[0].line
      startCol = startCol - lines[0].startCol
      endLine = lines[lines.length - 1].line
      endCol = endCol - lines[lines.length - 1].startCol
    
      const originalStart = this._originalPosition(startLine, startCol)
      startLine = originalStart.line
      startCol = originalStart.column
      
      const originalEnd = this._originalPosition(endLine, endCol)
      endLine = originalEnd.line
      endCol = originalEnd.column   
    } else {
      const lines = this.lines.filter(line => {
        return startCol <= line.endCol && endCol >= line.startCol
      })
      if (!lines.length) return empty

      startLine = lines[0].line
      startCol = startCol - lines[0].startCol
      endLine = lines[lines.length - 1].line
      endCol = endCol - lines[lines.length - 1].startCol
    }
      
    return {
      startLine,
      startCol,
      endLine,
      endCol
    }
  }
  _originalPosition (line, column) {
    return this.sourceMap.originalPositionFor({
      line,
      column,
      bias: LOWEST_UPPER_BOUND
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

function getShebangLength (source) {
  if (source.indexOf('#!') === 0) {
    const match = source.match(/(?<shebang>#!.*)/)
    if (match) {
      return match.groups.shebang.length
    }
  } else {
    return 0
  }
}

function parsePath (scriptPath) {
  return scriptPath.replace('file://', '')
}
