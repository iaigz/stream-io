const { finished, Transform, PassThrough } = require('stream')

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
 *   <bool> #failure [false]: asserts at least one error event is emitted
 *   <bool> #through [false]: asserts data flow as-is through stream
 *   <bool> #finish [true]: asserts stream emits "finish" event
 *   <bool> #end [true]: asserts stream emits "end" event
 *
 *   <Array> #emits [[]]: event names to capture emision on subject stream
 *   <bool> #buffer [false]: whenever to buffer data chunks as a string
 *
 * @returns <Promise>: fulfills specified stream
 */
test.duplex = function (stream, opts = {}) {
  opts = {
    // options for data sequence generation
    seq: ['data ', 'flows ', 'down the pipe\n'],
    sync: false,
    nextTick: true, // use process.nextTick instead of setImmediate
    step: true,
    overflow: false, // TODO
    // options for data consumer
    slow: 0,
    // information capture
    emits: [],
    buffer: false,
    // assertion enable/disable flags
    through: false,
    failure: false,
    finish: true,
    end: true,
    ...opts
  }

  const asyncOperation = (fn, ...args) => opts.nextTick
    ? process.nextTick(() => fn(...args))
    : setImmediate(fn, ...args)

  if (opts.slow && typeof opts.slow === 'boolean') opts.slow = 100

  // TODO PassTrough test is not compatilble with opts.step=false
  // because multiple seq values are received on one data event
  if (opts.through && !opts.step) {
    throw new Error('incompatible opts.through/opts.step')
  }

  const alias = this.$.alias = `${stream}`
  console.log(`DESC stream as ${alias}`)

  // opts.emits and error capture setup
  let emits = { error: false, finish: false, end: false }
  const errors = []
  stream.on('error', err => {
    console.log(`INFO ${alias} emits error "${err.message}"`)
    emits.error = true
    errors.push(err)
  })
  opts.emits.concat('finish', 'end').forEach(event => stream.once(event, () => {
    console.log(`INFO ${alias} emits "${event}"`)
    emits[event] = true
  }))
  if (opts.emits.length) {
    console.log('INFO will capture emision of', opts.emits)
    emits = opts.emits.reduce((object, event) => {
      object[event] = false
      return object
    }, emits)
  }

  // $source is a dumb stream used to emulate input via pipe() interface
  // $seq is the sequence of data which will be written to stream during test
  // $idx holds a pointer to current $seq index to be written
  // $next() advances $idx to next value, and writes it to the stream.
  const source = new PassThrough()
  console.log(`DESC source as ${source}`)
  const seq = opts.seq.slice(0)
  console.log(`DESC sequence as Array(${seq.length})`)
  let idx = -1
  let writeOverflows = 0
  const next = () => {
    if (++idx > seq.length) throw new Error('too much next() calls')
    if (idx < seq.length) {
      if (opts.step) console.log('HEAD sequence step %s: %j', idx, seq[idx])
      if (source.write(Buffer.from(seq[idx])) === false) {
        console.log(`INFO seq[${idx}] write has overflow ${alias}`)
        writeOverflows++
        return false
      }
      return true
    }
    console.log(`INFO sequence end reached, will end ${alias}`)
    asyncOperation(() => source.end())
    return null
  }

  // stream is consumed (and starts flowing) via pipe() to a $consumer stream
  // $dataCount stores how many 'data' events emits the consumer
  let data = opts.buffer ? '' : null
  let dataCount = 0
  const consumer = new Transform({
    transform (chunk, encoding, callback) {
      ++dataCount
      if (typeof data === 'string') data += chunk.toString()

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

      opts.step && asyncOperation(next)

      if (opts.slow) {
        return setTimeout(() => callback(null, chunk), opts.slow)
      }
      asyncOperation(callback, null, chunk)
    }
  })

  return new Promise((resolve, reject) => {
    finished(source.pipe(stream).pipe(consumer), err => {
      if (err) {
        console.log('FAIL consumer stream failed')
        return reject(err)
      }

      console.log(`HEAD after ${alias} has finished`)

      // PassThrough test assertions
      if (opts.through) {
        if (dataCount === seq.length) {
          console.log(`PASS ${alias} emitted ${dataCount} "data" events`)
        } else {
          console.error('actual times emitted:', dataCount)
          console.error('expected emissions:', seq.length)
          return reject(new Error('PassThrough test data count mismatch'))
        }
      }

      // failure assertions
      if (opts.failure) {
        if (emits.error) {
          console.log(`PASS stream has emitted ${errors.length} error events`)
        } else {
          console.error('emits:', emits)
          console.error('errors:', errors)
          return reject(new Error('stream should fail (emit "error" event)'))
        }
      } else {
        if (!emits.error) {
          console.log('PASS stream has not emitted "error" event')
        } else {
          console.error('emits:', emits)
          console.error('errors:', errors)
          return reject(new Error('stream should not emit "error" event'))
        }
      }

      // finish/end emision assertions
      ;['finish', 'end'].forEach(event => {
        if (opts[event] && emits[event]) {
          return console.log(`PASS stream has emitted "${event}"`)
        }
        if (opts[event] && !emits[event]) {
          console.error('emits:', emits)
          return reject(new Error(`stream should emit "${event}"`))
        }
        if (!opts[event] && !emits[event]) {
          return console.log(`PASS stream has not emitted "${event}"`)
        }
        console.error('emits:', emits)
        reject(new Error(`stream should not emit "${event}"`))
      })

      resolve({ test, seq, emits, errors, dataCount, writeOverflows, data })
    })

    // strategies for writting data to the stream
    const begin = () => {
      console.log('INFO data sequence begins, %s elements to go', seq.length)

      // strategy for opts.step = true
      if (opts.step) return next()

      // strategy for opts.step = false
      console.log('WARN instructed to write ASAP as much as posible')
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
        source.once('drain', writeOp)
      }
      writeOp()
    }

    if (opts.seq.length) {
      // write the first value from data sequence to the stream
      // Immediate write causes first _read() call to run before first _write()
      // "sync" write causes first _write() call to run before first _read()
      // "opts.nextTick" allows experimenting multiple scenarios
      if (opts.sync) {
        console.log('INFO sequence writes will begin synchronously')
        begin()
      } else {
        if (opts.nextTick) {
          console.log('INFO sequence writes will begin on nextTick')
          process.nextTick(begin)
        } else {
          console.log('INFO sequence writes will begin Immediately')
          setImmediate(begin)
        }
      }
    } else {
      console.log('INFO will write no data to stream')
    }
    console.trace('data sequence beginning')

    // consume the stream
    consumer
      .on('pause', () => console.log('INFO consumer has paused'))
      .on('resume', () => console.log('INFO consumer has resumed'))
      .resume()
  })
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
