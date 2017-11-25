// function that's not called.
function a() {
  if (x == 42) {
    if (x == 43) b(); else c();
  }
}

// function that's called once.
  function b () {
    const i = a ? 'hello' : 'goodbye'
    const ii = a && b
    const iii = a || 33
    return ii
  }

b()

// function that's called multiple times.
const c = () => {
  const i = 22
  const ii = i &&
    99
}

c(); c()

// class that never has member functions called.
class Foo {
  constructor () {
    this.test = 99
  }
  hello () {
    console.info('hello')
  }
}

// class that has member functions called.
  class Bar {
    constructor () {
      this.test = 99
    }
    hello () {
      console.info(`Hello ${this.test}`)
    }
  }

const d = new Bar()
d.hello()
