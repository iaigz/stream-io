console.log('TEST node', __filename)

process.on('exit', code => { console.log('CODE', code) })

let IOStream = null

try {
  IOStream = require('..')
  console.log('PASS module can be required without errors')
} catch (err) {
  console.error(err.stack)
  console.log('FAIL module should be able to be required without errors')
  process.exit(1)
}

if (typeof IOStream !== 'function') {
  console.error('typeof:', typeof IOStream)
  console.error('exports:', IOStream)
  console.log('FAIL module should export a function')
  process.exit(1)
} else {
  console.log('PASS module exports a function')
}

const { Readable, Writable } = require('stream')
let io = null

// arguments which should throw at instance creation
const incorrect = [
  // first argument must be string and is mandatory
  [], [null], [true], [false], [undefined],
  [1],
  [[]],
  [{}],

  // second argument must be array and is optional
  ['string', null],
  ['string', true],
  ['string', false],
  ['string', 1],
  ['string', {}],

  // third argument must be object and is optional
  ['string', [], true],
  ['string', [], false],
  ['string', [], 1],

  // YAGNI command as a command-line string => KISS!!!
  ['string', 'other string']
]
incorrect.forEach((value, idx) => {
  try {
    io = new IOStream(...value)
    throw new Error('creation should fail')
  } catch (err) {
    if (err.message === 'creation should fail') {
      console.error('arguments:', value)
      console.log('FAIL instance creation should fail (case %s)', idx)
      process.exit(1)
    }
    console.log('PASS instance creation fails (case %s)', idx)
  }
})

// arguments for successful instance creation
const correct = [
  // first argument must be string and is mandatory
  ['true'],

  // second argument is optional but must be array (any length, may be empty)
  ['true', undefined],
  ['true', []],
  ['true', [1, 2, 3]],

  // third argument is optional but must be object holding { keys: values }
  // anything having an 'object' typeof is honored
  ['true', [], undefined],
  ['true', [], null],
  ['true', [], []]
]

const fnProperties = [
  // just as example, already tested as inheritance from Stream ifaces
  'pipe', 'write', 'read'
]

correct.forEach((value, idx) => {
  console.log('HEAD successful instance creation (case %s)', idx)
  try {
    io = new IOStream(...value)
    console.log('PASS instance has been created succesfully (case %s)', idx)
  } catch (err) {
    console.error(err)
    console.error('arguments:', value)
    console.log(`FAIL instance should have been created succesfully (${idx})`)
    process.exit(1)
  }
  if (io instanceof Readable) {
    console.log('PASS instance inherits Readable stream (case %s)', idx)
  } else {
    console.error('arguments:', value)
    console.log(`FAIL instance should inherit from Readable stream (${idx})`)
    process.exit(1)
  }
  if (io instanceof Writable) {
    console.log('PASS instance inherits Writable stream (case %s)', idx)
  } else {
    console.error('arguments:', value)
    console.log('FAIL instance should inherit from Writable stream')
    process.exit(1)
  }
  if (io instanceof IOStream) {
    console.log('PASS instance inherits exported function (case %s)', idx)
  } else {
    console.error('arguments:', value)
    console.log(`FAIL instance should inherit from exported function (${idx})`)
    process.exit(1)
  }
  fnProperties.forEach(method => {
    if (typeof io[method] === 'function') {
      console.log(`PASS instance created (${idx}) has #${method}()`)
    } else {
      console.error('instance:', io)
      console.error(`typeof instance[${method}]:`, typeof io[method])
      console.log(`FAIL instance created (${idx}) should have #${method}()`)
      process.exit(1)
    }
  })
})

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
