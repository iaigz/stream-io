const assert = require('assert').strict

const { spawn } = require('child_process')

const { Duplex } = require('stream')

const IO = Symbol('IOStream')
const CP = Symbol('ChildProcess')

// IOStream is responsible of ONE (and only one) Input-Output operation.
class IOStream extends Duplex {
  constructor (cmd, argv = [], opts = {}) {
    assert(cmd, 'cmd (argument 1) is mandatory')
    assert(typeof cmd === 'string', 'cmd (argument 1) must be an string')
    assert(Array.isArray(argv), 'argv (argument 2) must be an array')
    assert(typeof opts === 'object', 'options (argument 3) must be an object')

    opts = {
      // $lazy instructs IO to wait until receiving data to spawn subprocess
      // set this value to false to spawn subprocess on instance creation
      lazy: true, // YAGNI, probably
      // TODO errput: writable destination for child's stderr
      ...opts
    }

    super()

    this[IO] = opts

    Object.defineProperties(this[IO], {
      cmd: { value: cmd, enumerable: true, writable: false },
      argv: { value: argv, enumerable: true, writable: false }
    })

    this[CP] = opts.lazy ? null : this.spawn()
  }

  // The spawn logic is decoupled to mantain Separation of Concerts
  spawn () {
    console.error('spawn', this[IO])
    return spawn(this[IO].cmd, this[IO].argv, {
      stdio: ['pipe', 'pipe', process.stderr]
    })
      .on('error', (err) => {
        console.error('Failed command:', this[IO].cmd)
        console.error('with argv list:', this[IO].argv)
        this.emit('error', err)
      })
      .on('exit', (code, signal) => {
        // let's determine if subprocess exit should be handled as error
        let error = null
        if (signal !== null) {
          error = new Error(`Child terminated due to signal ${signal}`)
        } else if (code > 0) {
          error = new Error(`Child failed with exit status ${code}`)
        }

        if (error) {
          if (signal) {
            console.error('TIP: use `kill -l %s` to see signal name', signal)
            console.error('TIP: see also `man 2 kill`')
          } else {
            console.error('TIP: use `autotest code %s`', code)
          }
          return this.emit('error', error)
        }

        console.error(`Child has exit gracefully (code ${code})`)
        console.error('stdout.readableEnded', this[CP].stdout.readableEnded)
        if (!this[CP].stdout.readableFlowing) {
          // readableFlowing is null when there is no consumer mechanism
          console.error('stdout.readableFlowing', this[CP].stdout.readableFlowing)
          console.error('STDOUT SOURCE IS PAUSED!!')
          this[CP].stdout.resume()
        }
        // console.log(this)
        // this[CP].stdout.end()
      })
      // "close" only emits after stdio streams close
      .on('close', (code, signal) => { console.error('closed stdio streams') })
      .on('close', (code, signal) => {
        // end readable side (output) if it's not already
        if (!this.readableEnded) this.push(null)
      })
  }

  // The writable interface follows received data to Subprocess' stdin
  _write (chunk, encoding, callback) {
    // lazily spawn subprocess if need
    if (this[CP] === null) this[CP] = this.spawn()

    if (!this[CP].stdin.writable) {
      return callback(new Error('Child stdin is not writable'))
    }

    // #write() each received chunk to Child process' stdin
    // Respect back-presure as instructed by #write()'s return value:
    // - **false** means: wait "drain" to finish operation
    // - **non-false** means: finish operation and continue
    if (this[CP].stdin.write(chunk, encoding) === false) {
      return this[CP].stdin.once('drain', callback)
    }
    return callback()
  }

  // The writable interface finish implies Subprocess' stdin.end()
  _final (callback) {
    // console.error('_final run')
    this[CP].stdin
      // .once('finish', () => console.log('Child stdin has finish'))
      .once('finish', callback)
      .end()
  }

  // The readable interface pushes data pulled from Subprocess' stdout
  _read (size) {
    // lazily spawn subprocess if need
    if (this[CP] === null) this[CP] = this.spawn()

    // remember: errors while reading must propagate through #destroy()
    if (!this[CP].stdout.readable) {
      return this.destroy(new Error('Child stdout is not readable'))
    }

    // setup mechanism to consume stdout source when needed
    if (this[CP].stdout.readableFlowing === null) {
      console.log('stdout source setup')
      return this[CP].stdout
        // REMEMBER: "don't push if you are not asked"
        // https://nodejs.org/es/docs/guides/backpressuring-in-streams/#rules-to-abide-by-when-implementing-custom-streams
        // consume data to perform one push
        .on('data', chunk => {
          // TODO YAGNI+KISS!! could duplicate output elsewhere like tee
          // process.stderr.write(`out: ${chunk.toString('utf8')}`)

          // Push each pulled chunk into the internal buffer
          // Respect back-pressure after pushing data:
          // If push() returns false, then pause the source
          if (this.push(chunk) === false) {
            this[CP].stdout.pause()
            console.error('overflowed, Child stdout paused')
          }
        })
        .once('end', () => {
          console.error('Child stdout has end!!')
          // this.push(null) // Pushing `null` chunk signals EOF
        })
    }

    // resume stdout source to switch from paused to flowing
    if (!this[CP].stdout.readableFlowing) {
      this[CP].stdout.resume()
      console.error('Child stdout resumed')
    }
  }
}

module.exports = IOStream

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
