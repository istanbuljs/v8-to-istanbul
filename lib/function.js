module.exports = class CovFunction {
  constructor (name, startLine, startCol, endLine, endCol, count) {
    this.name = name
    this.startLine = startLine
    this.startCol = startCol
    this.endLine = endLine
    this.endCol = endCol
    this.count = count
  }
  toIstanbul () {
    const loc = {
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
      name: this.name,
      decl: loc,
      loc: loc,
      line: this.startLine.line
    }
  }
}
