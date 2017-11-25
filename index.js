const Script = require('./lib/script')

module.exports = function (path) {
  return new Script(path)
}
