// compile me with babel 7+:
// > babel --plugins @babel/plugin-proposal-class-properties test/fixtures/scripts/needs-compile.js --out-file test/fixtures/scripts/needs-compile.compiled.js --source-maps
// in addition, a .gitattribute clause forces this file and its compilation assets to crlf

// class uses private class fields - must be compiled
// hello is called
class Foo {
  a = 1
  #b = 2
  constructor () {
    this.c = this.a + this.#b;
  }
  hello (i) {
    console.info('hello:', this.c + i)
  }
}

// class uses private class fields - must be compiled
// hello is never called
class Bar {
  #test = 99
  constructor () {
  }
  hello () {
    console.info(`Hello ${this.#test}`)
  }
}

const foo = new Foo();
foo.hello(1)
const bar = new Bar()

