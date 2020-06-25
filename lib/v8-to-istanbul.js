const assert = require('assert')
const convertSourceMap = require('convert-source-map')
const { dirname, isAbsolute, join, resolve } = require('path')
const CovBranch = require('./branch')
const CovFunction = require('./function')
const CovSource = require('./source')
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
  constructor (scriptPath, wrapperLength, sources, excludePath) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    assert(!isNode8, 'This module does not support node 8 or lower, please upgrade to node 10')
    this.path = parsePath(scriptPath)
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.excludePath = excludePath || (() => false)
    this.sources = sources || {}
    this.generatedLines = []
    this.branches = {}
    this.functions = {}
    this.covSources = []
    this.sourceMap = undefined
    this.sourceTranspiled = undefined
  }

  async load () {
    const rawSource = this.sources.source || await readFile(this.path, 'utf8')
    const rawSourceMap = this.sources.sourceMap ||
      // if we find a source-map (either inline, or a .map file) we load
      // both the transpiled and original source, both of which are used during
      // the backflips we perform to remap absolute to relative positions.
      convertSourceMap.fromSource(rawSource) || convertSourceMap.fromMapFileSource(rawSource, dirname(this.path))

    if (rawSourceMap) {
      if (rawSourceMap.sourcemap.sources.length > 1) {
        this.sourceMap = await new SourceMapConsumer(rawSourceMap.sourcemap)
        this.covSources = this.sourceMap.sourcesContent.map((rawSource, i) => ({ source: new CovSource(rawSource, this.wrapperLength), path: this.sourceMap.sources[i] }))
        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
      } else {
        this._rewritePath(rawSourceMap)
        this.sourceMap = await new SourceMapConsumer(rawSourceMap.sourcemap)

        let originalRawSource
        // If the source map has inline source content then it should be here
        // so use this inline one instead of trying to read the file off disk
        // Not sure what it means to have an array of more than 1 here so just ignore it
        // since we wouldn't know how to handle it
        if (this.sources.sourceMap && this.sources.sourceMap.sourcemap && this.sources.sourceMap.sourcemap.sourcesContent && this.sources.sourceMap.sourcemap.sourcesContent.length === 1) {
          originalRawSource = this.sources.sourceMap.sourcemap.sourcesContent[0]
        } else if (this.sources.originalSource) {
          originalRawSource = this.sources.originalSource
        } else {
          originalRawSource = await readFile(this.path, 'utf8')
        }

        this.covSources = [{ source: new CovSource(originalRawSource, this.wrapperLength), path: this.path }]
        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
      }
    } else {
      this.covSources = [{ source: new CovSource(rawSource, this.wrapperLength), path: this.path }]
    }
  }

  _rewritePath (rawSourceMap) {
    const sourceRoot = rawSourceMap.sourcemap.sourceRoot ? rawSourceMap.sourcemap.sourceRoot.replace('file://', '') : ''
    const sourcePath = rawSourceMap.sourcemap.sources.length >= 1 ? rawSourceMap.sourcemap.sources[0].replace('file://', '') : rawSourceMap.sourcemap.file
    const candidatePath = join(sourceRoot, sourcePath)

    if (isAbsolute(candidatePath)) {
      this.path = candidatePath
    } else {
      this.path = resolve(dirname(this.path), candidatePath)
    }
  }

  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const { startCol, endCol, path, covSource } = this._maybeRemapStartColEndCol(range)
        if (this.excludePath(path)) {
          return
        }
        const lines = covSource.lines.filter(line => {
          // Upstream tooling can provide a block with the functionName
          // (empty-report), this will result in a report that has all
          // lines zeroed out.
          if (block.functionName === '(empty-report)') {
            line.count = 0
            return true
          }

          return startCol <= line.endCol && endCol >= line.startCol
        })
        const startLineInstance = lines[0]
        const endLineInstance = lines[lines.length - 1]

        if (block.isBlockCoverage && lines.length) {
          this.branches[path] = this.branches[path] || []
          // record branches.
          this.branches[path].push(new CovBranch(
            startLineInstance.line,
            startCol - startLineInstance.startCol,
            endLineInstance.line,
            endCol - endLineInstance.startCol,
            range.count
          ))

          // if block-level granularity is enabled, we we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            this.functions[path] = this.functions[path] || []
            this.functions[path].push(new CovFunction(
              block.functionName,
              startLineInstance.line,
              startCol - startLineInstance.startCol,
              endLineInstance.line,
              endCol - endLineInstance.startCol,
              range.count
            ))
          }
        } else if (block.functionName && lines.length) {
          this.functions[path] = this.functions[path] || []
          // record functions.
          this.functions[path].push(new CovFunction(
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
  }

  _maybeRemapStartColEndCol (range) {
    let covSource = this.covSources[0].source
    let startCol = Math.max(0, range.startOffset - covSource.wrapperLength)
    let endCol = Math.min(covSource.eof, range.endOffset - covSource.wrapperLength)
    let path = this.path

    if (this.sourceMap) {
      startCol = Math.max(0, range.startOffset - this.sourceTranspiled.wrapperLength)
      endCol = Math.min(this.sourceTranspiled.eof, range.endOffset - this.sourceTranspiled.wrapperLength)

      const { startLine, relStartCol, endLine, relEndCol, source } = this.sourceTranspiled.offsetToOriginalRelative(
        this.sourceMap,
        startCol,
        endCol
      )

      path = source
      const matchingSource = this.covSources.find(covSource => covSource.path === path)
      covSource = matchingSource ? matchingSource.source : covSource
      // next we convert these relative positions back to absolute positions
      // in the original source (which is the format expected in the next step).
      startCol = covSource.relativeToOffset(startLine, relStartCol)
      endCol = covSource.relativeToOffset(endLine, relEndCol)
    }

    return {
      path,
      covSource,
      startCol,
      endCol
    }
  }

  getInnerIstanbul (source, path) {
    if (this.excludePath(path)) {
      return
    }

    return {
      [path]: {
        path,
        ...this._statementsToIstanbul(source, path),
        ...this._branchesToIstanbul(source, path),
        ...this._functionsToIstanbul(source, path)
      }
    }
  }

  toIstanbul () {
    return this.covSources.reduce((istanbulOuter, { source, path }) => Object.assign(istanbulOuter, this.getInnerIstanbul(source, path)), {})
  }

  _statementsToIstanbul (source, path) {
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

  _branchesToIstanbul (source, path) {
    const branches = {
      branchMap: {},
      b: {}
    }
    this.branches[path] = this.branches[path] || []
    this.branches[path].forEach((branch, index) => {
      const ignore = source.lines[branch.startLine - 1].ignore
      branches.branchMap[`${index}`] = branch.toIstanbul()
      branches.b[`${index}`] = [ignore ? 1 : branch.count]
    })
    return branches
  }

  _functionsToIstanbul (source, path) {
    const functions = {
      fnMap: {},
      f: {}
    }
    this.functions[path] = this.functions[path] || []
    this.functions[path].forEach((fn, index) => {
      const ignore = source.lines[fn.startLine - 1].ignore
      functions.fnMap[`${index}`] = fn.toIstanbul()
      functions.f[`${index}`] = ignore ? 1 : fn.count
    })
    return functions
  }
}

function parsePath (scriptPath) {
  return scriptPath.replace('file://', '')
}
