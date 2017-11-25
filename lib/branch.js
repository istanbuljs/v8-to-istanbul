module.exports = class CovBranch {
  constructor (startLine, startCol, endLine, endCol, count) {
    this.startLine = startLine
    this.startCol = startCol
    this.endLine = endLine
    this.endCol = endCol
    this.count = count
  }
  toIstanbul () {
    const location = {
      start: {
        line: this.startLine.line,
        column: this.startCol - this.startLine.startCol
      },
      end: {
        line: this.endLine.line,
        column: this.endCol - this.endLine.startCol
      }
    }
    return {
      type: 'branch',
      line: this.line,
      loc: location,
      locations: [Object.assign({}, location)]
    }
  }
}
