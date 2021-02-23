const assert = require('assert').strict
const test = require('./_test-stream')

const IO = require('..')

const infoCheck = (text) => function (info) {
  assert.equal(info.data, `${text}\n`, 'unexpected data output')
  return info.test
}

/*
 * this test will pipe default data sequence to echo, which closes stdin quick
 * (in fact, it ignores stdin data) and exits before stdio sockets connect
 *
 * this ensures subprocess.stdin won't be able to receive IO's input data
 * writting in in such situation won't be posible, and IO should handle
 * it accordingly, with a meagninful error (not EPIPE)
 */
test
  .begin()
  .then(test => {
    const text = 'first failure case (Immediate)'
    const stream = new IO('echo', [text])
    return test
      .duplex(stream, {
        buffer: true, failure: true, nextTick: false, finish: false
      })
      .then(infoCheck(text))
  })
  // The nextTick strategy is not stable (unpredictable)
  /* .then(test => {
    const text = 'second failure case (nextTick)'
    const stream = new IO('echo', [text])
    return test
      .duplex(stream, {
        buffer: true, failure: true, nextTick: true, finish: false
      })
      .then(infoCheck(text))
  }) // */
  .then(test => {
    const text = 'third failure case (sync: true)'
    const stream = new IO('echo', [text])
    return test
      .duplex(stream, {
        buffer: true, failure: true, sync: true, finish: false
      })
      .then(infoCheck(text))
  }) // */
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
