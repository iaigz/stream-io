const assert = require('assert').strict
const test = require('./_test-stream')

const IO = require('..')

/*
 * Let's ensure it's ENOENT when spawning an unexistant command
 */

const infoCheck = () => function (info) {
  assert.equal(info.errors.length, 1, 'expecting exactly ONE error')

  const error = info.errors[0]
  assert.equal(error.code, 'ENOENT')

  return info.test
}
test
  .begin()
  /* .then(test => {
    console.log('HEAD case 1 (Immediate)')
    const stream = new IO('unexistant-command')
    return test
      .duplex(stream, { failure: true, nextTick: false })
      .then(infoCheck())
  })
  .then(test => {
    console.log('HEAD case 2 (nextTick')
    const stream = new IO('unexistant-command')
    return test
      .duplex(stream, { failure: true, nextTick: true })
      .then(infoCheck())
  }) */
  .then(test => {
    console.log('HEAD case 3 (sync')
    const stream = new IO('unexistant-command')
    return test
      .duplex(stream, { failure: true, sync: true })
      .then(infoCheck())
  })
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
