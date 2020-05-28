
const IO = require('..')

console.error('>', process.argv.join(' '))

let input = process.stdin

if (process.stdin.isTTY) {
  console.error('WARN: stdin is a TTY device, will use a default input stub')
  console.error('To avoid this behaviour, redirect input or pipe in a process')
  console.error('i.e.:')
  console.error(`    <input-file.json ${process.argv.join(' ')}`)
  console.error(' or')
  console.error(`    input-program --comand here | ${process.argv.join(' ')}`)
  console.error('')

  const fs = require('fs')
  const path = require('path').posix
  const stub = path.resolve(__dirname, '../test/stub/input.json')

  console.error('input stub:', stub)
  input = fs.createReadStream(stub)
}

input
  .pipe(new IO('jq', ['--indent', 2]))
  .pipe(process.stdout)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
