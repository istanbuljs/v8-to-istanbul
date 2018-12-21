const Script = require('./lib/script')

module.exports = function (path, wrapperLength) {
  return new Script(path, wrapperLength)
}
