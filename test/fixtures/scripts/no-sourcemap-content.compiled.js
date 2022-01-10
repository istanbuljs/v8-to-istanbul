(() => {
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  var require_no_sourcemap_content_lib = __commonJS({
    "./no-sourcemap-content-lib.js"(exports, module) {
      function add2(a, b) {
        return a + b;
      }
      module.exports = add2;
    }
  });

  var add = require_no_sourcemap_content_lib();
  add(1, 2);
})();
//# sourceMappingURL=no-sourcemap-content.compiled.js.map
