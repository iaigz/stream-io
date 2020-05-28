const assert = require('assert').strict

const { Duplex } = require('stream')

module.exports = class IOStream extends Duplex {
  constructor (cmd, argv = [], opts = {}) {
    assert(cmd, 'cmd (argument 1) is mandatory')
    assert(typeof cmd === 'string', 'cmd (argument 1) must be an string')
    assert(Array.isArray(argv), 'argv (argument 2) must be an array')

    assert(typeof opts === 'object', 'options (argument 3) must be an object')
    opts = {
      hola: 'que tal',
      ...opts
    }

    super()
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
