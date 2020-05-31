const test = require('./_test-stream')

const IO = require('..')

const infoTester = (test) => function (info) {
  if (info.dataCount > 0) {
    console.log('PASS stream emitted "data" event %s times', info.dataCount)
  } else {
    console.error('times emitted:', info.dataCount)
    return test.end(new Error('no "data" event was emitted'))
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

  if (info.emits.drain) {
    console.log('PASS stream has emitted "drain" event')
  } else {
    return test.end(new Error('stream should emit "drain" event'))
  }

  if (info.writeOverflows > 0) {
    console.log(`PASS stream was write-pressed ${info.writeOverflows} times`)
  } else {
    return test.end(new Error('stream should receive write pressure'))
  }

  return test
}

const seqLength = 5000

test
  .begin({ timeout: seqLength * 150 })
  .then(test => {
    const stream = new IO('cat')

    return test
      .duplex(stream, {
        seq: new Array(seqLength).fill('thing ').map((a, b) => a + b),
        slow: 200,
        step: false, // step sequence will never overflow
        emits: ['drain'],
        through: false
      })
      .then(infoTester(test))
  })
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
