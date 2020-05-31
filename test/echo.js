const test = require('./_test-stream')

const IO = require('..')

// checks to perform after test.duplex fulfills
const infoTester = (test) => function (info) {
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

/*
 * this test will pipe default data sequence to echo, which closes stdin quick
 * (in fact, it ignores stdin data)
 *
 * this causes subprocess.stdin to be end when IO receives input data
 */
test
  .begin()
  .then(test => {
    const stream = new IO('echo', ['first echo test case'])
    return test
      .duplex(stream)
      .then(infoTester(test))
  })
  .then(test => {
    const stream = new IO('echo', ['second case (sync: true)'])
    return test
      .duplex(stream, { sync: true })
      .then(infoTester(test))
  })
  .catch(test.catcher)
  .finally(test.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
