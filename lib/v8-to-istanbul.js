const assert = require('assert')
const convertSourceMap = require('convert-source-map')
const { dirname, isAbsolute, join, resolve } = require('path')
const CovBranch = require('./branch')
const CovFunction = require('./function')
const CovSource = require('./source')
const SourceMapScanner = require('./sourcemapScanner')
const compatError = Error(`requires Node.js ${require('../package.json').engines.node}`)
let readFile = () => { throw compatError }
try {
  readFile = require('fs').promises.readFile
} catch (_err) {
  // most likely we're on an older version of Node.js.
}
const { SourceMapConsumer } = require('source-map')
const isOlderNode10 = /^v10\.(([0-9]\.)|(1[0-5]\.))/u.test(process.version)
const isNode8 = /^v8\./.test(process.version)

// Injected when Node.js is loading script into isolate pre Node 10.16.x.
// see: https://github.com/nodejs/node/pull/21573.
const cjsWrapperLength = isOlderNode10 ? require('module').wrapper[0].length : 0

module.exports = class V8ToIstanbul {
  constructor(scriptPath, wrapperLength, sources) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    assert(!isNode8, 'This module does not support node 8 or lower, please upgrade to node 10')
    this.path = parsePath(scriptPath)
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.sources = sources || {}
    this.sourceMap = undefined
    this.sourceTranspiled = undefined
    this.files = {}
  }

  async load () {
    const rawSource = this.sources.source || await readFile(this.path, 'utf8')
    const rawSourceMap = this.sources.sourceMap ||
      // if we find a source-map (either inline, or a .map file) we load
      // both the transpiled and original source, both of which are used during
      // the backflips we perform to remap absolute to relative positions.
      convertSourceMap.fromSource(rawSource) || convertSourceMap.fromMapFileSource(rawSource, dirname(this.path))

    if (rawSourceMap) {
      this.sourceMap = await new SourceMapConsumer(rawSourceMap.sourcemap)
      this.sourceMapScanner = new SourceMapScanner(this.sourceMap)
      const sourceRoot = rawSourceMap.sourcemap.sourceRoot

      for (let i = 0; i < rawSourceMap.sourcemap.sources.length; i++) {
        const originalPath = rawSourceMap.sourcemap.sources[i]
        const resolvedPath = this._rewritePath(sourceRoot, originalPath)

        let originalRawSource
        // If the source map has inline source content then it should be here
        // so use this inline one instead of trying to read the file off disk
        // Not sure what it means to have an array of more than 1 here so just ignore it
        // since we wouldn't know how to handle it
        if (this.sources.sourceMap && this.sources.sourceMap.sourcemap && this.sources.sourceMap.sourcemap.sourcesContent[i]) {
          originalRawSource = this.sources.sourceMap.sourcemap.sourcesContent[i]
        } else if (this.sources.originalSource) {
          originalRawSource = this.sources.originalSource
        } else {
          originalRawSource = await readFile(resolvedPath, 'utf8')
        }

        this._makeFileCoverage(originalPath, new CovSource(originalRawSource, this.wrapperLength), resolvedPath)
      }
      this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
    } else {
      this._makeFileCoverage(this.path, new CovSource(rawSource, this.wrapperLength))
    }
  }

  _makeFileCoverage (path, source, resolvedPath = path) {
    this.files[path] = {
      branches: [],
      functions: [],
      source,
      path,
      resolvedPath,
    }
  }

  _rewritePath (sourceRoot, sourcePath) {
    sourceRoot = sourceRoot ? sourceRoot.replace('file://', '') : ''
    sourcePath = sourcePath.replace('file://', '')

    const candidatePath = join(sourceRoot, sourcePath)

    if (isAbsolute(candidatePath)) {
      return candidatePath
    } else {
      return resolve(dirname(this.path), sourcePath)
    }
  }

  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const subRanges = this._maybeRemapStartColEndCol(range)
        if (!subRanges.length) {
          return
        }
        const startRange = subRanges[0]
        const endRange = subRanges[subRanges.length - 1]
        const { source, functions, branches } = startRange.fileInfo
        const lines = source.lines.filter(line => {
          // Upstream tooling can provide a block with the functionName
          // (empty-report), this will result in a report that has all
          // lines zeroed out.
          if (block.functionName === '(empty-report)') {
            line.count = 0
            return true
          }
          return startRange.startCol <= line.endCol && endRange.endCol >= line.startCol
        })
        const startLineInstance = lines[0]
        const endLineInstance = lines[lines.length - 1]
        const rangeArgument = [
          startLineInstance.line,
          startRange.startCol - startLineInstance.startCol,
          endLineInstance.line,
          endRange.endCol - endLineInstance.startCol,
        ]

        if (block.isBlockCoverage && lines.length) {
          // record branches.
          branches.push(new CovBranch(
            ...rangeArgument,
            range.count
          ))

          // if block-level granularity is enabled, we we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            functions.push(new CovFunction(
              block.functionName,
              ...rangeArgument,
              range.count
            ))
          }
        } else if (block.functionName && lines.length) {
          // record functions.
          functions.push(new CovFunction(
            block.functionName,
            ...rangeArgument,
            range.count
          ))
        }

        subRanges.forEach((subRange) => {
          const {
            startCol,
            endCol,
          } = subRange


          // record the lines (we record these as statements, such that we're
          // compatible with Istanbul 2.0).
          lines.forEach(line => {
            // make sure branch spans entire line; don't record 'goodbye'
            // branch in `const foo = true ? 'hello' : 'goodbye'` as a
            // 0 for line coverage.
            //
            // All lines start out with coverage of 1, and are later set to 0
            // if they are not invoked; line.ignore prevents a line from being
            // set to 0, and is set if the special comment /* c8 ignore next */
            // is used.
            if (startCol <= line.startCol && endCol >= line.endCol && !line.ignore) {
              line.count = range.count
            }
          })
        })
      })
    })
  }

  _maybeRemapStartColEndCol (range) {
    if (this.sourceMap) {
      const startCol = Math.max(0, range.startOffset - this.sourceTranspiled.wrapperLength)
      const endCol = Math.min(this.sourceTranspiled.eof, range.endOffset - this.sourceTranspiled.wrapperLength)

      const locs = this.sourceTranspiled.offsetToOriginalRelative(
        this.sourceMapScanner,
        startCol,
        endCol
      )

      let firstSource
      return locs.map((loc) => {
        const { startLine, relStartCol, endLine, relEndCol, sourceFile } = loc

        const fileInfo = this.files[sourceFile]

        if (!fileInfo) {
          return null
        }

        // next we convert these relative positions back to absolute positions
        // in the original source (which is the format expected in the next step).
        const startCol = fileInfo.source.relativeToOffset(startLine, relStartCol)
        const endCol = fileInfo.source.relativeToOffset(endLine, relEndCol)

        return {
          fileInfo,
          startCol,
          endCol
        }
      }).filter((loc) => {
        // filter out locations we don't have file info for
        if (!loc) {
          return false
        }
        // filter out all but the first source - its hard to manage a sngle coverage item going over multiple files
        if (!firstSource) {
          firstSource = loc.fileInfo.source
        } else if (loc.fileInfo.source !== firstSource) {
          return false
        }
        return true
      }).sort((a, b) => {
        return a.startCol > b.startCol ? 1 : -1
      })
    }

    const fileInfo = this.files[this.path]
    const startCol = Math.max(0, range.startOffset - fileInfo.source.wrapperLength)
    const endCol = Math.min(fileInfo.source.eof, range.endOffset - fileInfo.source.wrapperLength)

    return [{
      fileInfo,
      startCol,
      endCol
    }]
  }

  toIstanbul () {

    const istanbulOuter = {}
    Object.keys(this.files).forEach((file) => {

      const { resolvedPath, source, branches, functions } = this.files[file]

      const istanbulInner = Object.assign(
        { path: resolvedPath },
        this._statementsToIstanbul(source),
        this._branchesToIstanbul(source, branches),
        this._functionsToIstanbul(source, functions)
      )
      istanbulOuter[resolvedPath] = istanbulInner
    })
    return istanbulOuter
  }

  _statementsToIstanbul (source) {
    const statements = {
      statementMap: {},
      s: {}
    }
    source.lines.forEach((line, index) => {
      statements.statementMap[`${index}`] = line.toIstanbul()
      statements.s[`${index}`] = line.count
    })
    return statements
  }

  _branchesToIstanbul (source, branches) {
    const iBranches = {
      branchMap: {},
      b: {}
    }
    branches.forEach((branch, index) => {
      const ignore = source.lines[branch.startLine - 1].ignore
      iBranches.branchMap[`${index}`] = branch.toIstanbul()
      iBranches.b[`${index}`] = [ignore ? 1 : branch.count]
    })
    return iBranches
  }

  _functionsToIstanbul (source, functions) {
    const iFunctions = {
      fnMap: {},
      f: {}
    }
    functions.forEach((fn, index) => {
      const ignore = source.lines[fn.startLine - 1].ignore
      iFunctions.fnMap[`${index}`] = fn.toIstanbul()
      iFunctions.f[`${index}`] = ignore ? 1 : fn.count
    })
    return iFunctions
  }
}

function parsePath (scriptPath) {
  return scriptPath.replace('file://', '')
}
