const test = require('./_test-stream')

const IO = require('..')

// prepare data sequence to be written to subject stream
const seq = new Array(100000).fill('anything')

// checks to perform after test.duplex fulfills
const infoTester = (test) => function (info) {
  if (info.dataCount > 0) {
    console.log('PASS stream emitted "data" event %s times', info.dataCount)
  } else {
    console.error('times emitted:', info.dataCount)
    return test.end(new Error('"data" event emits count mismatch'))
  }

  if (!info.emits.error) {
    console.log('PASS stream has not emitted "error" event')
  } else {
    return test.end(new Error('stream should not emit "error" event'))
  }

  if (info.emits.finish && info.emits.end) {
    console.log('PASS stream has emitted "finish" and "end" events')
  } else {
    return test.end(new Error('stream should emit "finish" and "end"'))
  }

  return test
}

test
  .begin()
  .then(test => {
    const stream = new IO('cat')
    return test
      .duplex(stream, { seq, step: false, through: false })
      .then(infoTester(test))
  })
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
