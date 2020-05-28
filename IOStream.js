const assert = require('assert').strict

const { spawn } = require('child_process')

const { Duplex } = require('stream')

const IO = Symbol('IOStream')
const CP = Symbol('ChildProcess')

module.exports = class IOStream extends Duplex {
  constructor (cmd, argv = [], opts = {}) {
    assert(cmd, 'cmd (argument 1) is mandatory')
    assert(typeof cmd === 'string', 'cmd (argument 1) must be an string')
    assert(Array.isArray(argv), 'argv (argument 2) must be an array')
    assert(typeof opts === 'object', 'options (argument 3) must be an object')

    opts = {
      // lazy instructs IO to wait until receiving data to spawn subprocess
      // set this value to false to spawn subprocess on instance creation
      lazy: true, // YAGNI & KISS ....
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

  // The spawn logic could be inside _write while 'lazy' option is useless
  // Spawn logic decouple seems leaner for deploying subprocess event listeners
  spawn () {
    return spawn(this[IO].cmd, this[IO].argv, {
      stdio: ['pipe', 'pipe', process.stderr]
    })
      .on('error', (err) => {
        console.error('Failed to start', this[IO].cmd)
        console.error(' with argv list', this[IO].argv)
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
          console.error(error)
          if (signal) {
            console.error('TIP: use `kill -l %s` to see signal name', signal)
            console.error('TIP: see also `man 2 kill`')
          } else {
            console.error('TIP: use `autotest code %s`', code)
          }
          this.emit('error', error)
        } else {
          console.log(`Child has exit gracefully (code ${code})`)
        }
      })
      // "close" only emits after stdio streams close
      .on('close', (code, signal) => {
        console.log('Child closed stdio streams')
        this.push(null)
      })
  }

  // The writable interface follows received data to Subprocess' stdin
  _write (chunk, encoding, callback) {
    if (this[CP] === null) {
      this[CP] = this.spawn()
    }

    if (!this[CP].stdin.writable) {
      return callback(new Error('Child stdin is not writable'))
    }

    // #write() to Child process' stdin, but honor back-presure
    // #write() returns false when should wait "drain" to finish operation
    // non-false return value instructs us to finish operation and continue
    if (this[CP].stdin.write(chunk, encoding) === false) {
      console.error('waiting drain event to finish write')
      return this[CP].stdin.once('drain', callback)
    }
    process.nextTick(callback)
  }

  // The writable side finish implies Subprocess' stdin.end()
  _final (callback) {
    this[CP].stdin.once('finish', callback).end()
  }

  // The readable interface pushes data pulled from Subprocess' stdout
  _read (size) {
    // remember: errors while reading must propagate through #destroy()
    if (!this[CP].stdout.readable) {
      return this.destroy(new Error('Child stdout is not readable'))
    }

    if (this[CP].stdout.readableFlowing === null) {
      // there is no mechanism to consume Child's stdout, let's setup one
      this[CP].stdout
        .on('data', chunk => {
          // TODO YAGNI+KISS!! could duplicate output elsewhere like tee
          // console.error('out: %s', chunk)

          // Push each pulled chunk into the internal buffer
          // Honor back-pressure after pushing data:
          // If push() returns false, then stop reading from source.
          if (this.push(chunk) === false) {
            console.log('Child stdout paused')
            this[CP].stdout.pause()
          }
        })
        .on('end', () => {
          console.log('Child stdout has end!!')
          // When the source ends, push the EOF-signaling `null` chunk.
          // this.push(null);
        })
    } else {
      console.log('stdout.readableFlowing:', this[CP].stdout.readableFlowing)
    }
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
