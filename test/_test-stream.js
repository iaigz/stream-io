const { finished } = require('stream')

/*
 * present module exports an interface which extends functionality of $parent
 * test interface, meant for test scripts which test an stream subject
 */

const parent = require('./_test-base')
const test = module.exports = Object.create(parent)

/*
 * sets-up stream-specific environment
 *
 * @param <Array>: sequence of values to be writen to the stream subject
 *
 * sequence members must have a type acceptable by Buffer.from()
 */
test.prepare = function (seq = []) {
  // console.log('INFO will pipe %s streams to build pipeline', streams.length)
  // streams.reduce((src, dest) => src.pipe(dest))

  this.$.seq = seq

  return Promise.resolve(test)
}

/*
 * instructs the test to run with specified stream case study
 *
 * @param <Duplex>: stream being the subject of the test run
 * @param <Object>: options to alter how to write data sequence to stream
 *   <Array> #seq: data sequence to be written to stream
 *   <bool> #sync: instructs first write to not wait until process.nextTick
 *   <bool> #step: instructs to wait until "data" event for next writes
 *   <bool> #through: asserts data flow as-is through stream
 * @returns <Promise>: fulfills specified stream
 */
test.duplex = function (stream, opts = {}) {
  opts = {
    seq: ['data ', 'flows ', 'down the pipe\n'],
    sync: false,
    step: true, // TODO wait until "data" fires to write next chunk
    emits: ['error', 'finish', 'end'],
    through: false,
    ...opts
  }
  const alias = this.$.alias = `[object ${stream.constructor.name}]`
  console.log(`DESC ${alias} as subject stream test alias`)

  // $seq is the sequence of data which will be written to stream during test
  // $idx holds a pointer to current $seq index to be written
  // $idx also counts how many 'data' events emits the stream
  const seq = opts.seq.slice(0)
  console.log(`DESC data sequence as Array(${seq.length})`)
  let idx = 0
  const next = () => {
    console.log('HEAD data sequence value %s: %j', idx, seq[idx])
    stream.write(Buffer.from(seq[idx]))
  }
  const emits = opts.emits.reduce((acc, curr) => {
    acc[curr] = false
    return acc
  }, {})
  opts.emits.forEach(eventName => {
    stream.once(eventName, () => {
      console.log(`INFO ${alias} emits "${eventName}"`)
      emits[eventName] = true
    })
  })

  // stream is consumed (starts flowing) via 'data' event interface
  stream.on('data', chunk => {
    // whenever issued to do so, assert data passes through duplex stream
    if (opts.through) {
      const actual = [].slice.call(chunk)
      const expect = Buffer.from(seq[idx])

      const fail = (msg) => {
        console.error('position (idx):', idx)
        console.error('actual array: %j', actual)
        console.error('actual chunk:', chunk)
        console.error('expect buffer:', expect)
        console.error(`expect value (seq[${idx}]):`, seq[idx])
        test.end(new Error(msg))
      }

      if (actual.length === expect.length) {
        console.log(`PASS actual buffer length is correct for seq[${idx}]`)
      } else {
        return fail(`actual buffer length incorrect for seq[${idx}]`)
      }

      if (actual.every((value, idx) => value === expect[idx])) {
        console.log('PASS actual buffer has every expected value')
      } else {
        return fail(`actual buffer misses some expected value at seq[${idx}]`)
      }
    }

    ++idx

    if (opts.step) {
      if (idx === seq.length) {
        console.log('INFO test data sequence end reached')
        return stream.end() // emulate input end when seq has finish
      }
      next()
    }
  })

  return new Promise((resolve, reject) => {
    finished(stream, err => {
      if (err) {
        console.error(err)
        console.log('FAIL stream %s failed', alias)
        process.exitCode = 1
        return reject(err)
      }
      console.log('INFO stream %s has succesfully finished', alias)
      resolve({
        seq,
        emits,
        dataCount: idx
      })
    })
    // writing the first value from data sequence to the stream
    // delayed write causes first _read() call to run before first _write()
    // "sync" write causes first _write() call to run before first _read()
    const begin = () => {
      console.log('INFO data sequence begins, %s elements to go', seq.length)
      if (opts.step) {
        next()
      } else {
        console.log('INFO data sequence writes will be done at once')
        seq.forEach(value => process.nextTick(() => {
          stream.write(Buffer.from(value))
        }))
        process.nextTick(() => stream.end())
      }
    }
    if (opts.sync) {
      console.log('INFO data sequence write will begin synchronously')
      begin()
    } else {
      process.nextTick(begin)
    }
  })
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
