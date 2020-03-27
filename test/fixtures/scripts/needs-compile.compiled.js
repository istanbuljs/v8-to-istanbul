function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to get private field on non-instance"); } if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

// compile me with babel 7+:
// > babel --plugins @babel/plugin-proposal-class-properties test/fixtures/scripts/needs-compile.js --out-file test/fixtures/scripts/needs-compile.compiled.js --source-maps
// class uses private class fields - must be compiled
// hello is called
class Foo {
  constructor() {
    _defineProperty(this, "a", 1);

    _b.set(this, {
      writable: true,
      value: 2
    });

    this.c = this.a + _classPrivateFieldGet(this, _b);
  }

  hello(i) {
    console.info('hello:', this.c + i);
  }

} // class uses private class fields - must be compiled
// hello is never called


var _b = new WeakMap();

class Bar {
  constructor() {
    _test.set(this, {
      writable: true,
      value: 99
    });
  }

  hello() {
    console.info(`Hello ${_classPrivateFieldGet(this, _test)}`);
  }

}

var _test = new WeakMap();

const foo = new Foo();
foo.hello(1);
const bar = new Bar();

//# sourceMappingURL=needs-compile.compiled.js.map