// basic binary operation.
const a = 99 || 33

// basic conditional operation.
const b = false ? 'hello' : 'goodbye'

// nary operation.
const c = a && b && false && 33

// if statement.
if (false) {
  const d = 99
}
  else {
    console.info('hello')
  }

// if statement in function.
function e () {
  if (true) {
    console.info('hey')
  } else {
    const f = 99
  }
}

e()

// binary operation that spans multiple lines.
const g = 99 &&
  33 || 13
