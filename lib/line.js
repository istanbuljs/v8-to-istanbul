module.exports = class CovLine {
  constructor (line, startCol, endCol) {
    this.line = line
    this.startCol = startCol
    this.endCol = endCol
    this.count = 0
  }
  toIstanbul () {
    return {
      start: {
        line: this.line,
        column: 0
      },
      end: {
        line: this.line,
        column: this.endCol - this.startCol
      }
    }
  }
}
