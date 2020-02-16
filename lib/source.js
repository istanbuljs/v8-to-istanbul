const CovLine = require('./line')
const { GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND } = require('source-map').SourceMapConsumer

module.exports = class CovSource {
  constructor(sourceRaw, wrapperLength) {
    sourceRaw = sourceRaw.trimEnd()
    this.lines = []
    this.eof = sourceRaw.length
    this.shebangLength = getShebangLength(sourceRaw)
    this.wrapperLength = wrapperLength - this.shebangLength
    this._buildLines(sourceRaw)
  }

  _buildLines (source) {
    let position = 0
    let ignoreCount = 0
    for (const [i, lineStr] of source.split(/(?<=\r?\n)/u).entries()) {
      const line = new CovLine(i + 1, position, lineStr)
      if (ignoreCount > 0) {
        line.ignore = true
        ignoreCount--
      } else {
        ignoreCount = this._parseIgnoreNext(lineStr, line)
      }
      this.lines.push(line)
      position += lineStr.length
    }
  }

  _parseIgnoreNext (lineStr, line) {
    const testIgnoreNextLines = lineStr.match(/^\W*\/\* c8 ignore next (?<count>[0-9]+)? *\*\/\W*$/)
    if (testIgnoreNextLines) {
      line.ignore = true
      if (testIgnoreNextLines.groups.count) {
        return Number(testIgnoreNextLines.groups.count)
      } else {
        return 1
      }
    } else {
      if (lineStr.match(/\/\* c8 ignore next \*\//)) {
        line.ignore = true
      }
    }

    return 0
  }

  // given a start column and end column in absolute offsets within
  // a source file (0 - EOF), returns the relative line column positions.
  offsetToOriginalRelative (sourceMapScanner, startCol, endCol) {
    const lines = this.lines.filter((line, i) => {
      return startCol <= line.endCol && endCol >= line.startCol
    })
    if (!lines.length) {
      return []
    }

    const sourceMapIterator = sourceMapScanner.getIterator()
    let start = sourceMapIterator.scanTo(lines[0].line, startCol - lines[0].startCol)
    let last = start
    let endPos = { line: lines[lines.length - 1].line, col: endCol - lines[lines.length - 1].startCol }
    let returnLocs = []
    while (true) {
      let next = sourceMapIterator.next()
      const isPastEnd = !next || sourceMapIterator.isGeneratedAfter(next, endPos.line, endPos.col)

      if (isPastEnd || next.source !== start.source ||
        next.originalLine < start.originalLine ||
        (next.originalLine === start.originalLine && next.originalColumn < start.originalColumn)) {
        if (last !== start) {
          returnLocs.push({
            sourceFile: start.source,
            startLine: start.originalLine,
            relStartCol: start.originalColumn,
            endLine: last.originalLine,
            relEndCol: last.originalColumn
          })
        }
        if (isPastEnd) {
          break
        }
        start = next
      } else {

        // now we now we aren't going past the start (or different source) or the end etc.
        // if the next token is going back past the last, ignore it.
        if (next.originalLine < last.originalLine ||
          (next.originalLine === last.originalLine && next.originalColumn < last.originalColumn)) {
          continue
        }
      }

      last = next
    }
    return this._removeOverlapping(returnLocs)
  }

  // minimize overlapping ranges to avoid bumping up the branches/functions count unless very necessary
  _removeOverlapping (returnLocs) {
    if (returnLocs.length <= 1) {
      return returnLocs
    }
    const bySource = Object.create(null)
    returnLocs.forEach((loc) => {
      if (!bySource[loc.source]) {
        bySource[loc.source] = []
      }
      bySource[loc.source].push(loc)
    })

    const dedupedLocs = []
    Object.keys(bySource).forEach((source) => {
      let locs = bySource[source]
      while (locs.length) {
        const loc1 = locs.pop()
        let isOverlapped = false

        for (let i = 0; i < locs.length; i++) {
          const loc2 = locs[i]
          if (loc2 === loc1) {
            return
          }

          let isEndLoc1BeforeLoc2Start = ((loc1.endLine < loc2.startLine) || (loc1.endLine === loc2.startLine && loc1.relEndCol < loc2.relStartCol))
          let isEndLoc2BeforeLoc1Start = ((loc2.endLine < loc1.startLine) || (loc1.endLine === loc2.startLine && loc2.relEndCol < loc1.relStartCol))

          // |A...|B...|A..|B
          // |A...|B...|B..|A
          // |B...|A...|B..|A
          // |B...|A...|A..|B
          // |A...|A...|B..|B // isEndLoc1BeforeLoc2Start
          // |B...|B...|A..|A // isEndLoc2BeforeLoc1Start

          if (!(isEndLoc1BeforeLoc2Start || isEndLoc2BeforeLoc1Start)) {
            const isStartAfter = ((loc1.startLine > loc2.startLine) || (loc1.startLine === loc2.startLine && loc1.relStartCol >= loc2.relStartCol))
            const isEndAfter = ((loc1.endLine > loc2.endLine) || (loc1.endLine === loc2.endLine && loc1.relEndCol >= loc2.relEndCol))

            const start = isStartAfter ? loc2 : loc1
            const end = isEndAfter ? loc1 : loc2
            locs.splice(i, 1)
            locs.push({
              source: start.source,
              startLine: start.startLine,
              relStartCol: start.relStartCol,
              endLine: end.endLine,
              relEndCol: end.relEndCol,
            })
            isOverlapped = true
            break
          }
        }

        if (!isOverlapped) {
          dedupedLocs.push(loc1)
        }
      }
    })

    return dedupedLocs
  }

  relativeToOffset (line, relCol) {
    line = Math.max(line, 1)
    if (this.lines[line - 1] === undefined) return this.eof
    return Math.min(this.lines[line - 1].startCol + relCol, this.lines[line - 1].endCol)
  }
}

// this implementation is pulled over from istanbul-lib-sourcemap:
// https://github.com/istanbuljs/istanbuljs/blob/master/packages/istanbul-lib-source-maps/lib/get-mapping.js
//
/**
 * AST ranges are inclusive for start positions and exclusive for end positions.
 * Source maps are also logically ranges over text, though interacting with
 * them is generally achieved by working with explicit positions.
 *
 * When finding the _end_ location of an AST item, the range behavior is
 * important because what we're asking for is the _end_ of whatever range
 * corresponds to the end location we seek.
 *
 * This boils down to the following steps, conceptually, though the source-map
 * library doesn't expose primitives to do this nicely:
 *
 * 1. Find the range on the generated file that ends at, or exclusively
 *    contains the end position of the AST node.
 * 2. Find the range on the original file that corresponds to
 *    that generated range.
 * 3. Find the _end_ location of that original range.
 */
function originalEndPositionFor (sourceMap, line, column) {
  // Given the generated location, find the original location of the mapping
  // that corresponds to a range on the generated file that overlaps the
  // generated file end location. Note however that this position on its
  // own is not useful because it is the position of the _start_ of the range
  // on the original file, and we want the _end_ of the range.
  const beforeEndMapping = sourceMap.originalPositionFor({
    line,
    column,
    bias: LEAST_UPPER_BOUND
  })

  if (beforeEndMapping.source === null) {
    return null
  }

  // Convert that original position back to a generated one, with a bump
  // to the right, and a rightward bias. Since 'generatedPositionFor' searches
  // for mappings in the original-order sorted list, this will find the
  // mapping that corresponds to the one immediately after the
  // beforeEndMapping mapping.
  const afterEndMapping = sourceMap.generatedPositionFor({
    source: beforeEndMapping.source,
    line: beforeEndMapping.line,
    column: beforeEndMapping.column + 1,
    bias: GREATEST_LOWER_BOUND
  })
  const afterOriginalPos = afterEndMapping.line !== null && sourceMap.originalPositionFor(afterEndMapping)

  if (
    // If this is null, it means that we've hit the end of the file,
    // so we can use Infinity as the end column.
    afterEndMapping.line === null ||
    // If these don't match, it means that the call to
    // 'generatedPositionFor' didn't find any other original mappings on
    // the line we gave, so consider the binding to extend to infinity.
    afterOriginalPos.line !== beforeEndMapping.line ||
    afterOriginalPos.source !== beforeEndMapping.source
  ) {
    return {
      source: beforeEndMapping.source,
      line: beforeEndMapping.line,
      column: Infinity
    }
  }

  // Convert the end mapping into the real original position.

  return {
    source: afterOriginalPos.source,
    line: afterOriginalPos.line - (afterOriginalPos.column === 0 ? 1 : 0),
    column: afterOriginalPos.column === 0 ? Infinity : afterOriginalPos.column
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
