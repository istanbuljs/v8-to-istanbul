/* global describe, it */
/* eslint-disable no-template-curly-in-string */

const assert = require('assert')
const { resolve } = require('path')
const convert = require('../index')
const codeLines = require('../lib/code-lines')
const { Script } = require('vm')
const supportsOptionalChaining = (() => {
  try {
    return Boolean(new Script('a?.b'))
  } catch (err) {
    return false
  }
})()

require('tap').mochaGlobals()

async function coverage (source, blocks) {
  const filename = resolve('example.js')
  const converter = convert(filename, 0, { source })
  await converter.load()
  converter.applyCoverage(blocks || [{ functionName: 'f', isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: source.trimEnd().length, count: 0 }] }])
  return converter.toIstanbul()[filename]
}

function statements (result) {
  return Object.entries(result.statementMap).map(([id, location]) => [location.start.line, result.s[id]])
}

describe('Non-code lines', () => {
  for (const [name, extra] of [
    ['no comments', ''],
    ['line comments', '  // first\n  // second\n  // third\n'],
    ['blank lines', '\n \t\n\n'],
    ['block comment', '  /* first\n   * second\n   */\n']
  ]) {
    it(`keeps line coverage invariant with ${name}`, async () => {
      const source = `function f(x) {\n${extra}  const y = x + 1;\n  if (x < 0) {\n    return -y;\n  }\n  return y;\n}\nf(1);\n`
      const result = await coverage(source, [{
        functionName: 'f',
        isBlockCoverage: true,
        ranges: [
          { startOffset: 0, endOffset: source.length, count: 1 },
          { startOffset: source.indexOf('{', source.indexOf('if')), endOffset: source.indexOf('  }') + 3, count: 0 }
        ]
      }])
      const counts = Object.values(result.s)
      assert.strictEqual(counts.length, 8)
      assert.strictEqual(counts.filter(count => count > 0).length, 6)
    })
  }
})

describe('Code line classification', () => {
  for (const [name, source, expected] of [
    ['comments and whitespace', '// x\n \t\n/* a\nb\n*/\nconst x = 1 // end\n', [false, false, false, false, false, true, false]],
    ['mixed lines', '/* a */ x(); /* b\nc */ y();\n/* only */', [true, true, false]],
    ['quotes and escaped quotes', String.raw`const x = "\\\"/*"; const y = '//'; // tail` + '\n// end', [true, false]],
    ['continued string', "const x = 'a\\\n// string\\\n';\n// end", [true, true, true, false]],
    ['template interior whitespace', 'const x = `\n\n// literal\n/* literal */\n`;\n// end', [true, true, true, true, true, false]],
    ['nested substitutions', 'const x = `${\n// comment\n{ x: `${\n/* comment */\n1}` }.x\n}`;\n// end', [true, false, true, false, true, true, false]],
    ['escaped template delimiters', 'const x = `\\` \\${\n// literal\n`;\n// end', [true, true, true, false]],
    ['regex classes and escapes', String.raw`const x = /[/*]\/\//g; // tail` + '\n// end', [true, false]],
    ['division then comment', 'const x = 6 / 2 / 3; /* a\nb */\n// end', [true, false, false]],
    ['return regex', 'function f() { return /[/*]/ }\n// end', [true, false]],
    ['control parens', 'if (x) /[/*]/.test(x); /* a\nb */', [true, false]],
    ['postfix and division', 'x++ / 2; /* a\nb */\nx-- / 2; // end', [true, false, true]],
    ['regex recovery at newline', 'const x = /broken\n// comment\nlet y = 1', [true, false, true]],
    ['CRLF block comment', '/* a\r\nb */\r\nx()\r\n', [false, false, true, false]]
  ]) {
    it(name, () => assert.deepStrictEqual(codeLines(source), expected))
  }

  it('line map drops comments without moving code or branch/function positions', async () => {
    const result = await coverage('// header\nfunction f() {\n  /* comment */\n  return 1\n}\nf()\n')
    assert.deepStrictEqual(statements(result), [[2, 0], [4, 0], [5, 0], [6, 0]])
    assert.strictEqual(result.branchMap[0].loc.start.line, 1)
    assert.strictEqual(result.fnMap[0].loc.start.line, 1)
  })

  it('ignore next counts physical lines, including a removed comment', async () => {
    const result = await coverage('/* c8 ignore next 2 */\n// comment\na()\nb()\n')
    assert.deepStrictEqual(statements(result), [[3, 1], [4, 0]])
  })

  it('ignore start/stop and inline next retain their semantics', async () => {
    const result = await coverage('/* c8 ignore start */\na()\n/* c8 ignore stop */\nb() /* c8 ignore next */\nc()\n')
    assert.deepStrictEqual(statements(result), [[2, 1], [4, 1], [5, 0]])
  })

  it('empty reports omit non-code and retain zero-count code and all flag', async () => {
    const source = '// header\n\nx()\n'
    const blocks = [{ functionName: '(empty-report)', isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: source.length, count: 0 }] }]
    const result = await coverage(source, blocks)
    assert.deepStrictEqual(statements(result), [[3, 0]])
    assert.strictEqual(result.all, true)
    assert.deepStrictEqual(statements(await coverage('// only comment\n', blocks)), [])
  })

  for (const [name, source] of [
    ['function expression division', 'const quotient = function () {} / 2; /* start\n comment only\n*/\n'],
    ['class expression division', 'const quotient = class X {} / 2; /* start\n comment only\n*/\n'],
    ['class declaration', 'class X {} /* start\n comment only\n*/\n'],
    ['nested function expression braces', 'const quotient = function () { if (true) {} } / 2; /* start\n comment only\n*/\n'],
    ['control block closing brace', 'if (true) {} /[/*]/.test("x"); /* start\n comment only\n*/\n'],
    ['nested control head parentheses', 'if ((true)) {} /[/*]/.test("x"); /* start\n comment only\n*/\n']
  ]) {
    it(name, () => {
      assert.doesNotThrow(() => new Script(source))
      assert.deepStrictEqual(codeLines(source), [true, false, false, false])
    })
  }

  for (const [name, source, expected] of [
    ['else block before regex preserves subsequent code', 'if (false) {} else {} /[/*]/.test("x");\nfunction missed() {\n  return 1;\n}\n', [true, true, true, true, false]],
    ['function declaration before quoted regex', 'function declared() {}\n/["/*]/.test("x");\nconst x = 1;\n', [true, true, true, false]],
    ['class declaration before regex', 'class X {}\n/[/*]/.test("x");\nconst x = 1;\n', [true, true, true, false]],
    ['object literal division', 'const quotient = {} / 2; /* start\n comment only\n*/\n', [true, false, false, false]],
    ['nested block function block', '{\n  function f() {\n    if (false) {} else {} /[/*]/.test("x");\n  }\n  /["/*]/.test("x");\n  const quotient = function () { if (true) {} } / 2; /* start\n comment only\n*/\n}\n', [true, true, true, true, true, true, false, false, true, false]],
    ['try finally before regex', 'try {} finally {} /[/*]/.test("x");\nconst x = 1;\n', [true, true, false]],
    ['do block before regex', 'do {} while (false); /[/*]/.test("x");\nconst x = 1;\n', [true, true, false]]
  ]) {
    it(name, () => {
      assert.doesNotThrow(() => new Script(source))
      assert.deepStrictEqual(codeLines(source), expected)
    })
  }

  it('method body keeps nested function declarations in statement position', () => {
    const source = 'class Outer { method() { function inner() {} /[/*]/.test("x"); } }\nconst x = 1;\n'
    assert.doesNotThrow(() => new Script(source))
    assert.deepStrictEqual(codeLines(source), [true, true, false])
  })

  // Keyword-shaped members remain operands, including before a call's parens.
  for (const keyword of [
    'try', 'finally', 'else', 'do', 'catch', 'if', 'while', 'for', 'with', 'switch',
    'return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of',
    'yield', 'await', 'new', 'function', 'class', 'async', 'export', 'default'
  ]) {
    for (const access of ['.', '?.']) {
      it(`${access}${keyword} member preserves division and following code`, async () => {
        const tail = '\nfunction missed() {\n  return 1;\n}\n'
        for (const operand of [
          `({ ${keyword}: 4 })${access}${keyword}`,
          `({ ${keyword}() { return 4; } })${access}${keyword}()`
        ]) {
          const source = `const quotient = ${operand} / /[/*]/.source.length;${tail}`
          assert.doesNotThrow(() => new Script(source))
          assert.deepStrictEqual(codeLines(source), [true, true, true, true, false])
          assert.deepStrictEqual(statements(await coverage(source)), [[1, 0], [2, 0], [3, 0], [4, 0]])
          const comment = `const quotient = ${operand} / 2; /* start\n comment only\n*/\n`
          assert.doesNotThrow(() => new Script(comment))
          assert.deepStrictEqual(codeLines(comment), [true, false, false, false])
        }
      }, { skip: access === '?.' && !supportsOptionalChaining })
    }
  }

  for (const [name, head, optionalChaining] of [
    ['array spread typeof regex', 'const value = [...typeof /[/*]/];'],
    ['object spread typeof regex', 'const value = { ...typeof /[/*]/ };'],
    ['argument spread typeof regex', 'const value = Array(...typeof /[/*]/);'],
    ['template substitution spread typeof regex', 'const value = `${[...typeof /[/*]/]}`;'],
    ['spread delete regex', 'const value = { ...delete /[/*]/ };'],
    ['spread void regex', 'const value = { ...void /[/*]/ };'],
    ['spread regex operand', 'const value = [.../[/*]/.source];'],
    ['spread await regex', 'async function run() { return [...await /[/*]/.source]; } run();'],
    ['spread yield regex', 'function * run() { return [...yield /[/*]/]; }'],
    ['spread then division regex', 'const a = []; const value = [...a].map(() => {}) / /[/*]/.source.length;'],
    ['optional member after spread', 'const value = [...({ try: "x" })?.try];', true],
    ['spread inside optional index', 'const value = ({ x: 1 })?.[[...typeof /[/*]/]];', true]
  ]) {
    it(name, async () => {
      const source = `${head}\nfunction missed() {\n  return 1;\n}\n`
      assert.doesNotThrow(() => new Script(source))
      assert.deepStrictEqual(codeLines(source), [true, true, true, true, false])
      assert.deepStrictEqual(statements(await coverage(source)), [[1, 0], [2, 0], [3, 0], [4, 0]])
    }, { skip: optionalChaining && !supportsOptionalChaining })
  }

  it('spread then division keeps multiline comment lines out of coverage', async () => {
    const source = 'const a = []; const value = [...a].map(() => {}) / 2; /* start\n comment only\n*/\n'
    assert.doesNotThrow(() => new Script(source))
    assert.deepStrictEqual(codeLines(source), [true, false, false, false])
    assert.deepStrictEqual(statements(await coverage(source)), [[1, 0]])
  })
})
