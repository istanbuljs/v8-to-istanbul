const esbuild = require('esbuild')
const vlq = require('vlq')

module.exports = function (source, path) {
  let result
  try {
    const loader = path.endsWith('.tsx') || path.endsWith('.jsx') ? { loader: 'tsx', jsx: 'preserve' } : {}
    result = esbuild.transformSync(source.sourceRaw, {
      sourcemap: 'external',
      loader: 'ts',
      minify: false,
      minifyWhitespace: false,
      minifySyntax: false,
      legalComments: 'none',
      ...loader
    })
  } catch (err) {
    console.error(`${path} parsed with error ${err.message}`)
    return
  }
  const mappings = JSON.parse(result.map).mappings
  if (mappings) {
    let start = 0
    const executableLines = mappings.split(';').reduce((set, str) => {
      start = str.split(',').reduce((number, seg) => {
        const [, , line] = vlq.decode(seg)
        set.add(number + line)
        return number + line
      }, start)
      return set
    }, new Set())
    source.lines.forEach((line, index) => {
      line.ignore = line.ignore || !executableLines.has(index)
    })
  }
}
