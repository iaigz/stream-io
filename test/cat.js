console.log('TEST', process.argv.join(' '))

process.on('exit', code => { console.log('CODE', code) })

// $seq is the sequence of data which will be written to stream during tests
// $idx holds a pointer to current $seq index to be tested
// $idx also counts how many 'data' events emits the stream
// $end is used to trap whenever stream emits the 'end' event
const seq = [
  'some words flow down the pipe\n',
  'lets test if it is passing data through\n',
  [3], // will send Ctrl+C code
  'still alive?\n',
  'awesome\n'
]
let idx = 0
let end = false
let finish = false

process.on('beforeExit', () => {
  if (idx === seq.length) {
    console.log('PASS stream "data" event was emitted %s times', idx)
  } else {
    console.error('idx (times emitted):', idx)
    console.log('FAIL "data" should have been emmited %s times', seq.length)
    process.exitCode = 1
  }
  if (!finish) {
    console.log('FAIL "finish" event should have been emmited')
    process.exitCode = 1
  }
  if (!end) {
    console.log('FAIL "end" event should have been emmited')
    process.exitCode = 1
  }
})

const StreamBuilder = require('..')

const stream = new StreamBuilder('cat')

stream
  .on('error', err => {
    console.error(err)
    console.log('FAIL stream should not emit "error" event during test')
    process.exitCode = 1
  })
  // The IO is consumed (starts flowing) via 'data' event interface
  .on('data', actual => {
    const expect = Buffer.from(seq[idx])

    const diag = () => {
      console.error(`seq[${idx}]:`, seq[idx])
      console.error('expect:', expect)
      console.error('actual:', actual)
    }

    if (actual.length === expect.length) {
      console.log('PASS actual buffer length is correct for seq[%s]', idx)
    } else {
      diag()
      console.log('FAIL actual buffer length incorrect for seq[%s]', idx)
      process.exit(1)
    }

    if ([].slice.call(actual).every((value, pos) => value === expect[pos])) {
      console.log('PASS actual buffer has every expected value', idx)
    } else {
      diag()
      console.log('FAIL actual buffer values are incorrect for seq[%s]', idx)
      process.exit(1)
    }

    if (++idx === seq.length) {
      console.log('INFO test data sequence end reached')
      stream.end() // emulate input (writable side) end when seq has finish
    } else {
      console.log('HEAD data sequence value %s: %j', idx, seq[idx])
      stream.write(Buffer.from(seq[idx]))
      process.exitCode = 1
    }
  })
  .on('finish', () => {
    console.log('PASS stream emits "finish"')
    finish = true
  })
  .on('end', () => {
    console.log('PASS stream emits "end"')
    end = true
  })

// test timeout mechanics
// $timeLimit is max miliseconds until force exit (and fail with code 124)
// $timeout must be cleared to allow node process to exit gracefully
const timeLimit = 3 * 1000
const timeout = setTimeout(() => {
  console.log(`FAIL test took more than ${timeLimit / 1000} seconds.`)
  console.log('INFO will force process.exit')
  process.exit(124)
}, timeLimit)

const { finished } = require('stream')

finished(stream, err => {
  clearTimeout(timeout)
  if (err) {
    console.error(err)
    console.log('FAIL stream failed')
    process.exitCode = 1
    return stream.destroy()
  }
  console.log('INFO stream has succesfully finished')
  process.exitCode = 0
})

// begin test writing the first value from data sequence to the stream
try {
  console.log('INFO test data sequence begins, %s elements to go', seq.length)
  stream.write(Buffer.from(seq[idx]))
} catch (err) {
  console.error(err)
  console.log('FAIL writing to the stream should not throw')
  process.exitCode = 1
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
