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

  _buildLines(source) {
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

  _parseIgnoreNext(lineStr, line) {
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
  offsetToOriginalRelative(sourceMap, startCol, endCol) {
    const lines = this.lines.filter((line, i) => {
      return startCol <= line.endCol && endCol >= line.startCol
    })
    if (!lines.length) {
      console.log('unable to find lines?!')
      return []
    }

    // this range covers multiple files, so we need to split it up
    let hasTsx = false;
    let thisStartCol = startCol;
    let thisStartLine = 0;
    let thisEndCol = startCol + 1;
    let thisEndLine = 0;
    let lastEndLine = thisEndLine;
    if (lines[thisEndLine].endCol <= thisEndCol) {
      thisEndLine++;
    }
    let lastEnd;
    let thisStart = originalPositionTryBoth(
      sourceMap,
      lines[0].line,
      startCol - lines[0].startCol
    );
    let returnLocs = [];
    while (thisEndCol <= endCol) {
      const thisEnd = originalEndPositionFor(
        sourceMap,
        lines[thisEndLine].line,
        thisEndCol - lines[thisEndLine].startCol
      );

      const isGoingForward = thisEnd && thisStart && thisEnd.line >= thisStart.line && (thisEnd.line > thisStart.line || thisEnd.column >= thisStart.column);
      if (thisEnd && thisEnd.source === thisStart.source && thisEndCol !== endCol && isGoingForward) {
        lastEnd = thisEnd;
      } else {
        // Give up if we werent previously valid to ignore non mapped blocks inside the region
        if (lastEnd && thisStart.source) {

          if (thisStart.line === lastEnd.line && thisStart.column === lastEnd.column) {
            const potentialLastEnd = sourceMap.originalPositionFor({
              line: lines[lastEndLine].line,
              column: (thisEndCol - 1) - lines[lastEndLine].startCol,
              bias: LEAST_UPPER_BOUND
            })
            potentialLastEnd.column -= 1
            if (lastEnd.source === potentialLastEnd.source) {
              lastEnd = potentialLastEnd
            }
          }

          // ignore 0 length maps
          //if (thisStart.line !== lastEnd.line && thisStart.column !== lastEnd.column) {
          if (thisStart.source.indexOf('tsx') >= 0) {
            /*            console.log(thisStartCol + '(' + startCol + ')', ':', thisEndCol + '(' + endCol + ')',
                          { l: lines[thisStartLine].line, c: thisStartCol - lines[thisStartLine].startCol },
                          { l: lines[lastEndLine].line, c: (thisEndCol - 1) - lines[lastEndLine].startCol },
                          '->', thisStart.source, { l: thisStart.line, c: thisStart.column }, { l: lastEnd.line, c: lastEnd.column })*/
            hasTsx = true;
          }
          returnLocs.push({
            sourceFile: thisStart.source,
            startLine: thisStart.line,
            relStartCol: thisStart.column,
            endLine: lastEnd.line,
            relEndCol: lastEnd.column
          });
          //}
          //console.log('found range', returnLocs[returnLocs.length - 1]);
          lastEnd = null;
        } else {
          //console.log('something broken', lastEnd, thisStart.source)
        }
        thisStartCol = thisEndCol;
        thisStartLine = thisEndLine;
        thisStart = originalPositionTryBoth(
          sourceMap,
          lines[thisEndLine].line,
          Math.max(0, thisEndCol - lines[thisEndLine].startCol)
        );
      }
      thisEndCol++;
      lastEndLine = thisEndLine;
      if (lines[thisEndLine].endCol < thisEndCol) {
        thisEndLine++;
      }
    }

    if (hasTsx && returnLocs.length > 1) {
      console.log('non minimized has multi-ranges')
    }

    return returnLocs;
  }

  relativeToOffset(line, relCol) {
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
function originalEndPositionFor(sourceMap, line, column) {
  // Given the generated location, find the original location of the mapping
  // that corresponds to a range on the generated file that overlaps the
  // generated file end location. Note however that this position on its
  // own is not useful because it is the position of the _start_ of the range
  // on the original file, and we want the _end_ of the range.
  const beforeEndMapping = originalPositionTryBoth(
    sourceMap,
    line,
    Math.max(column - 1, 1)
  )

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
    bias: LEAST_UPPER_BOUND
  })
  if (
    // If this is null, it means that we've hit the end of the file,
    // so we can use Infinity as the end column.
    afterEndMapping.line === null ||
    // If these don't match, it means that the call to
    // 'generatedPositionFor' didn't find any other original mappings on
    // the line we gave, so consider the binding to extend to infinity.
    sourceMap.originalPositionFor(afterEndMapping).line !==
    beforeEndMapping.line
  ) {
    return {
      source: beforeEndMapping.source,
      line: beforeEndMapping.line,
      column: Infinity
    }
  }

  // Convert the end mapping into the real original position.
  return sourceMap.originalPositionFor(afterEndMapping)
}

function originalPositionTryBoth(sourceMap, line, column) {
  let original = sourceMap.originalPositionFor({
    line,
    column,
    bias: GREATEST_LOWER_BOUND
  })
  if (original.line === null) {
    original = sourceMap.originalPositionFor({
      line,
      column,
      bias: LEAST_UPPER_BOUND
    })
  }

  if (original && original.source && original.source.indexOf('tsx') > 0) {
    // console.log({ line, column }, 'became', original)
  }

  return original

}

function getShebangLength(source) {
  if (source.indexOf('#!') === 0) {
    const match = source.match(/(?<shebang>#!.*)/)
    if (match) {
      return match.groups.shebang.length
    }
  } else {
    return 0
  }
}
