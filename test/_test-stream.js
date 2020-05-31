const { finished, Transform } = require('stream')

/*
 * present module exports an interface which extends functionality of $parent
 * test interface, meant for test scripts which test an stream subject
 */

const parent = require('./_test-base')
const test = module.exports = Object.create(parent)

/*
 * instructs the test to run with specified stream case study
 *
 * @param <Duplex>: stream being the subject of the test run
 * @param <Object>: options to alter how test behaves
 *   <Array> #seq: data sequence to be written to stream
 *   <bool> #sync: instructs first write to be done inmediately
 *   <bool> #step: instructs to wait until "data" event for subsequent writes
 *   <bool> #overflow: instructs to ignore stream back-pressure
 *
 *   <number|boolean> #slow: instructs to emulate an slow consumer (ms)
 *
 *   <bool> #through: asserts data flow as-is through stream
 *
 *   <Array> #emits: event names to capture emision on subject stream
 * @returns <Promise>: fulfills specified stream
 */
test.duplex = function (stream, opts = {}) {
  opts = {
    // options for data sequence generation
    seq: ['data ', 'flows ', 'down the pipe\n'],
    sync: false,
    step: true,
    overflow: false, // TODO
    // options for data consumer
    slow: 0,
    // assertion enable/disable flags
    through: false,

    ...opts,

    // information capture
    emits: ['error', 'finish', 'end'].concat(opts.emits || [])
  }

  if (opts.slow && typeof opts.slow === 'boolean') opts.slow = 100

  // TODO PassTrough test is not compatilble with opts.step=false
  // because multiple seq values are received on one data event
  if (opts.through && !opts.step) {
    throw new Error('incompatible opts.through/opts.step')
  }

  const alias = this.$.alias = `[object ${stream.constructor.name}]`
  console.log(`HEAD subject stream ${alias}`)
  console.log(`DESC ${stream} as subject stream`)

  // opts.emits setup
  console.log('INFO will capture emision of', opts.emits)
  const emits = opts.emits.reduce((object, event) => {
    object[event] = false
    return object
  }, {})
  opts.emits.forEach(event => stream.once(event, () => {
    console.log(`INFO ${alias} emits "${event}"`)
    emits[event] = true
  }))

  // $seq is the sequence of data which will be written to stream during test
  // $idx holds a pointer to current $seq index to be written
  // $next() advances $idx to next value, and writes it to the stream.
  const seq = opts.seq.slice(0)
  let idx = -1
  let writeOverflows = 0
  const next = () => {
    if (++idx > seq.length) throw new Error('too much next() calls')
    if (idx < seq.length) {
      if (opts.step) console.log('HEAD sequence step %s: %j', idx, seq[idx])
      if (stream.write(Buffer.from(seq[idx])) === false) {
        console.log(`INFO seq[${idx}] write has overflow ${alias}`)
        writeOverflows++
        return false
      }
      return true
    }
    console.log(`INFO test data sequence end reached, will end ${alias}`)
    process.nextTick(() => stream.end())
    return null
  }

  // stream is consumed (and starts flowing) via pipe() to a $consumer stream
  // $dataCount stores how many 'data' events emits the consumer
  let dataCount = 0
  const consumer = new Transform({
    transform (chunk, encoding, callback) {
      ++dataCount

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

      opts.step && process.nextTick(next)

      if (!opts.slow) return callback(null, chunk)
      setTimeout(() => callback(null, chunk), opts.slow)
    }
  })

  return new Promise((resolve, reject) => {
    finished(stream.pipe(consumer), err => {
      if (err) {
        console.error(err)
        console.log('FAIL stream %s failed', alias)
        process.exitCode = 1
        return reject(err)
      }

      console.log(`HEAD after ${alias} has finished`)

      // complete PassThrough test when applicable
      if (opts.through) {
        if (dataCount === seq.length) {
          console.log(`PASS ${alias} emitted ${dataCount} "data" events`)
        } else {
          console.error('actual times emitted:', dataCount)
          console.error('expected emissions:', seq.length)
          return reject(new Error('PassThrough test data count mismatch'))
        }
      }

      resolve({ seq, emits, dataCount, writeOverflows })
    })

    // strategies for writting data to the stream
    const begin = () => {
      console.log('INFO data sequence begins, %s elements to go', seq.length)

      // strategy for opts.step = true
      if (opts.step) return next()

      // strategy for opts.step = false
      console.log('NOTE instructed to write ASAP as much as posible')
      const writeOp = (more = true) => {
        const begin = idx + 1
        console.log(`HEAD sequence values from ${begin} onwards`)
        do { more = next() } while (more)

        if (more === null) {
          console.log(`INFO ${idx - begin} values written through end`)
          return // sequence is done
        }

        // TODO opts.overflow
        console.log(`INFO ${idx - begin} values pending once ${alias} drains`)
        stream.once('drain', writeOp)
      }
      writeOp()
    }

    // write the first value from data sequence to the stream
    // delayed write causes first _read() call to run before first _write()
    // "sync" write causes first _write() call to run before first _read()
    if (opts.sync) {
      console.log('INFO data sequence write will begin synchronously')
      begin()
    } else {
      process.nextTick(begin)
    }

    // consume the stream
    consumer
      .on('pause', () => console.log('INFO consumer has paused'))
      .on('resume', () => console.log('INFO consumer has resumed'))
      .resume()
  })
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
