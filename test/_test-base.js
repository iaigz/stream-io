
// this module holds a common interface between test scripts
const test = module.exports = {}

/*
 * outputs TEST statement, and sets-up process bindings/conf
 * returns <Promise> (fulfills with test object)
 */
test.begin = function (opts = {}) {
  console.log('TEST', process.argv.join(' '))

  // unless stated otherwise:
  // - ensure CODE statement is written to stdout on exit
  // - ensure process exit status is greater than 0 (make it fail)
  process.on('exit', code => { console.log('CODE', code) })
  process.exitCode = 1

  this.opts = {
    timeout: 3 * 1000,
    ...opts
  }

  this.env = this.$ = Object.create(null)

  return this.opts.timeout ? this.timeout() : Promise.resolve(this)
}

/*
 * outputs TIME statement, and sets-up a timeout which forces process.exit(124)
 * failure unless it's cleared before time gap elapses
 *
 * @param <Number>: time gap (miliseconds)
 * returns <Promise> (fulfills with test object)
 */
test._to = null
test.timeout = function (limit = this.opts.timeout) {
  console.log('TIME', limit, 'ms')
  this._to = setTimeout(() => {
    console.log(`FAIL timed out after ${limit / 1000} seconds`)
    process.exit(124)
  }, limit)
  return Promise.resolve(this)
}

/*
 * performs test teardown tasks, and sets exit status accordingly. If no error
 * is provided, test is asumed to succeed with exit status 0
 *
 * @param <Error> (Optional): error causing test to end
 */
test.end = function (err) {
  clearTimeout(this._to)
  if (err !== null) {
    console.error('error:', err)
    if (!(err instanceof Error)) {
      console.log('FAIL test failure error is not an instance of Error')
    } else {
      console.log('FAIL', err.message)
    }
    console.log('INFO will force process exit')
    process.exit(process.exitCode || 1)
  } else {
    console.log('INFO test#end reached without error (set exit status 0)')
    process.exitCode = 0
  }
}
// TODO test.fail(err)
// TODO test.done()

Object.defineProperties(test, {
  catcher: { get: function () { return this.end.bind(this) } },
  teardown: { get: function () { return this.end.bind(this, null) } }
})

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
