const { Transform } = require('stream')
const { spawn } = require('child_process')

module.exports = class IOStream extends Transform {
  constructor (command, cmdArgs = [], options = {}) {
    if (!command) {
      throw new TypeError('first argument is mandatory')
    }
    if (typeof options !== 'object') {
      throw new TypeError('Options must be an object')
    }

    options = { io: {}, ...options }

    // throw new TypeError('First argument must be a string')
    if (!Array.isArray(cmdArgs)) {
      throw new TypeError('Second argument must be an Array')
    }

    super(options)

    this._io = {
      cp: null,
      command,
      cmdArgs,
      opts: {
        debug: false, // debugging output
        // success: 0, // TODO expected exit status code
        stderr: true, // whenever to throw if receives stderr data
        EOL: '\n', // End-Of-Line terminator for stderr message handling
        BOL: '\r', // Beggining-Of-Line terminator for stderr message handling
        ...options.io
      }
    }

    // const { command, args } = this._io
    const cp = this._io.cp = spawn(command, cmdArgs)
      .once('error', err => this.destroy(err))
      .once('exit', (code, signal) => {
        this._debug(`exit ${code}`)

        // exit with status code 0 is the expected result
        if (code === 0) return this.push(null)

        // non-zero exit codes mean something unexpected
        if (std2.length) {
          console.error(std2.map(msg => `${this} stderr: ${msg}`).join('\n'))
        }
        throw new Error(`exit with code ${code} and signal ${signal}`)
      })

    cp.stdout
      .on('readable', () => {
        this._debug('stdout source becomes readable', false)
        let read = true
        while (read) {
          const chunk = cp.stdout.read()
          this._debug(`read ${chunk ? `${chunk.length} bytes` : chunk}`, false)

          // a null chunk will signal output's source EOF
          if (!chunk) break

          // continue reading as issued by back-pressure system
          read = this.push(chunk)
        }
      })
      .on('end', () => {
        this._debug('stdout source has end', false)
      })

    const { EOL, BOL } = this._io.opts
    const std2 = []
    let stderr = ''
    cp.stderr
      .on('readable', () => {
        while (true) {
          const chunk = cp.stderr.read()
          // a null chunk will signal stderr's source EOF
          if (!chunk) break

          stderr += chunk.toString()

          if (stderr.indexOf(EOL) > -1) {
            stderr.split(EOL).forEach((msg, idx, messages) => {
              if (idx === messages.length - 1) {
                stderr = msg
                return
              }
              if (msg.indexOf(BOL) > -1) {
                return std2.push(msg.split(BOL).pop().trim())
              }
              std2.push(msg)
            })
          }
        }
      })
      .on('end', () => {
        if (!this._io.opts.stderr || stderr === '') return
        this.destroy(new Error(`${this} stderr: ${stderr}`))
      })

    cp.stdin
      .on('finish', () => {
        this._debug('stdin sink has finish', false)
      })
  }

  toString () {
    return `<IO ${this._io.command}>`
  }

  _transform (chunk, encoding, callback) {
    const { cp } = this._io
    this._debug(`${this} transform ${chunk.length} bytes`, false)

    if (cp.exitCode !== null) {
      return callback(new Error(`${this} has exit with code ${cp.exitCode}`))
    }

    try {
      if (cp.stdin.write(chunk, encoding)) {
        this._debug('synchronously finish transform')
        return callback()
      }
    } catch (err) {
      return callback(err)
    }

    this._debug('stdin sink write returned false, wait until it drains', false)
    cp.stdin.once('drain', () => {
      this._debug('stdin sink has drain', false)
      callback()
    })

    if (cp.stdout.isPaused()) {
      this._debug('resumed stdout source', false)
      cp.stdout.resume()
    }
  }

  // /*
  _flush (callback) {
    const { cp } = this._io
    this._debug('flushing...', false)
    cp.stdin.end()

    /*
      .once('finish', () => {
        this._debug('all writes to stdin sink have been completed')
      })
    */
    // callback()
  }
  // */

  _debug (message, info = true) {
    if (!this._io.opts.debug) return

    const { cp } = this._io
    console.error(`${this} ${message}`, info ? {
      // inputPending: cp.stdin.pending,
      // inputConnecting: cp.stdin.connecting,
      inputWritable: cp.stdin.writable,
      inputWritableEnded: cp.stdin.writableEnded,
      inputWritableLength: cp.stdin.writableLength,
      inputWritableFinished: cp.stdin.writableFinished,
      outputReadableEnded: cp.stdout.readableEnded,
      outputReadableLength: cp.stdout.readableLength,
      outputReadableFlowing: cp.stdout.readableFlowing,
      outputReadableisPaused: cp.stdout.isPaused()
    } : '')
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
