const test = require('./_test-stream')

const IO = require('..')

// prepare data sequence to be written to subject stream
const seq = [
  'some words flow down the pipe\n',
  'lets test if it is passing data through\n',
  [3], // will send Ctrl+C code
  'still alive?\n',
  'awesome\n'
]

// checks to perform after test.duplex fulfills
const infoTester = (test) => function (info) {
  const actual = info.dataCount
  const expect = info.seq.length
  if (actual === expect) {
    console.log('PASS stream emitted %s "data" event(s)', actual)
  } else {
    console.error('times emitted:', actual)
    console.error('expected emits:', expect)
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
      .duplex(stream, { seq })
      .then(infoTester(test))
  })
  .then(test => {
    const stream = new IO('cat')
    return test
      .duplex(stream, { seq, sync: true })
      .then(infoTester(test))
  })
  .then(test => {
    const stream = new IO('cat')
    return test
      .duplex(stream, { seq, step: false, through: false })
      .then(info => {
        console.error(info)
        return test
      })
  })
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
