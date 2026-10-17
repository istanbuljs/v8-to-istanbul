// A lexical line classifier, deliberately independent of the coverage ranges.
// Keep physical offsets in CovSource; only statement emission uses this mask.
module.exports = function codeLines (source) {
  const lines = [false]
  let line = 0
  let i = 0
  const normal = (interpolation = false) => ({
    mode: 'normal',
    interpolation,
    braces: [],
    parens: [],
    brackets: 0,
    constructs: [],
    statement: !interpolation,
    regex: true,
    last: ''
  })
  const stack = [normal()]
  const expressionKeywords = new Set(['return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of', 'yield', 'await', 'else', 'do', 'new'])
  const blockKeywords = new Set(['else', 'do', 'try', 'finally'])
  const controlKeywords = new Set(['if', 'while', 'for', 'with', 'switch', 'catch'])
  function consume (code) {
    if (code) lines[line] = true
    if (source[i++] === '\n') lines[++line] = false
  }
  function operand () {
    const parent = stack[stack.length - 1]
    parent.regex = false
    parent.statement = false
    parent.last = 'operand'
  }
  while (i < source.length) {
    const state = stack[stack.length - 1]
    const c = source[i]
    const next = source[i + 1]
    if (state.mode === 'line') {
      if (c === '\n' || c === '\r') stack.pop()
      consume(false)
    } else if (state.mode === 'block') {
      if (c === '*' && next === '/') {
        consume(false)
        consume(false)
        stack.pop()
      } else consume(false)
    } else if (state.mode === 'quote') {
      consume(true)
      if (c === '\\' && i < source.length) {
        if (source[i] === '\r' && source[i + 1] === '\n') consume(true)
        consume(true)
      } else if (c === state.quote) {
        stack.pop()
        operand()
      }
    } else if (state.mode === 'template') {
      consume(true)
      if (c === '\\' && i < source.length) {
        consume(true)
      } else if (c === '`') {
        stack.pop()
        operand()
      } else if (c === '$' && next === '{') {
        consume(true)
        stack.push(normal(true))
      }
    } else if (state.mode === 'regex') {
      // Invalid candidates must not hide comments on subsequent source lines.
      if (c === '\n' || c === '\r') {
        stack.pop()
        operand()
        consume(false)
      } else {
        consume(true)
        if (c === '\\' && i < source.length && !/[\r\n]/.test(source[i])) {
          consume(true)
        } else if (c === '[') state.inClass = true
        else if (c === ']') state.inClass = false
        else if (c === '/' && !state.inClass) {
          stack.pop()
          operand()
        }
      }
    } else if (/\s/.test(c)) {
      consume(false)
    } else if (c === '/' && (next === '/' || next === '*')) {
      consume(false)
      consume(false)
      stack.push({ mode: next === '/' ? 'line' : 'block' })
    } else if (c === '"' || c === "'" || c === '`') {
      consume(true)
      stack.push(c === '`' ? { mode: 'template' } : { mode: 'quote', quote: c })
    } else if (c === '/' && state.regex) {
      consume(true)
      stack.push({ mode: 'regex', inClass: false })
    } else if (/[\w$\u0080-\uFFFF]/.test(c)) {
      let token = ''
      do {
        token += source[i]
        consume(true)
      } while (i < source.length && /[\w$\u0080-\uFFFF]/.test(source[i]))
      const keyword = state.last !== '.' && state.last !== '?.'
      if (keyword && (token === 'function' || token === 'class')) {
        state.constructs.push({
          statement: state.statement,
          parens: state.parens.length,
          brackets: state.brackets,
          braces: state.braces.length
        })
      }
      state.regex = keyword && (expressionKeywords.has(token) || blockKeywords.has(token))
      state.statement = keyword && (blockKeywords.has(token) || (state.statement && ['async', 'export', 'default'].includes(token)))
      // A member name must not become a control head when followed by parens.
      state.last = keyword ? token : 'operand'
    } else {
      consume(true)
      if (c === '(') {
        state.parens.push(controlKeywords.has(state.last))
        state.regex = true
        state.statement = false
      } else if (c === ')') {
        state.regex = state.parens.pop() === true
        state.statement = state.regex
        state.last = state.regex ? 'control)' : ')'
        continue
      } else if (c === '{') {
        const pending = state.constructs[state.constructs.length - 1]
        const body = pending && pending.parens === state.parens.length &&
          pending.brackets === state.brackets && pending.braces === state.braces.length
        const statement = body ? state.constructs.pop().statement : state.statement
        const statementsInside = body || statement || state.last === '=>' || state.last === ')'
        state.braces.push({
          statement,
          body: statementsInside,
          parens: state.parens.length,
          brackets: state.brackets
        })
        state.statement = statementsInside
        state.regex = true
      } else if (c === '}') {
        if (state.interpolation && state.braces.length === 0) {
          stack.pop()
          continue
        }
        const brace = state.braces.pop()
        // Exotic labeled blocks, odd getters and ASI boundaries can be ambiguous.
        // If context is missing, keep code visible by allowing a regex candidate;
        // its raw-newline recovery avoids silently swallowing following structure.
        state.regex = brace ? brace.statement : true
        state.statement = state.regex
      } else if (c === '[') {
        state.brackets++
        state.regex = true
        state.statement = false
      } else if (c === ']') {
        state.brackets--
        state.regex = false
        state.statement = false
      } else if (c === '.') {
        if (next === '.' && source[i + 1] === '.') {
          consume(true)
          consume(true)
          state.regex = true
          state.statement = false
          state.last = '...'
          continue
        }
        state.regex = false
        state.statement = false
      } else if (c === ';') {
        const brace = state.braces[state.braces.length - 1]
        state.statement = (!brace || brace.body) &&
          state.parens.length === (brace ? brace.parens : 0) &&
          state.brackets === (brace ? brace.brackets : 0)
        state.regex = true
      } else if ((c === '+' || c === '-') && next === c) {
        consume(true)
        state.statement = false
        // Prefix keeps expression context; postfix keeps operand context.
      } else if (c === '=' && next === '>') {
        consume(true)
        state.regex = true
        state.statement = false
        state.last = '=>'
        continue
      } else {
        state.regex = true
        state.statement = false
      }
      state.last = c
    }
  }
  return lines
}
