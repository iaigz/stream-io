# @iaigz/stream-io

> Pipeable subprocesses

This is an utility to pipe to/from spawned child processes likewise a command
line pipeline.

> **IOStream** is responsible of ONE, and only one, Input-Output operation.

Internally, it wraps a Subprocess whoose standard input can be reached
through the _Writable_ stream interface; and whoose standard output can be
consumed from the _Readable_ stream counterpart.

- - -

Time have elapsed since I messed-up with the Duplex aproach. At that
time I thought IO may perform operations with data which aren't a
transform - in the sense of _transformation_ - but some day I found the
following wonderful piece of knowledge at SO.

## Difference between Transform and Duplex

> taken from https://stackoverflow.com/a/18339203/1894803

A Duplex stream can be thought of a readable stream with a writable stream.
Both are independent and each have separate internal buffer.
The reads and writes events happen independently.

### Duplex Stream
                       ------------------|
                 Read  <-----               External Source
         You           ------------------|
                 Write ----->               External Sink
                       ------------------|
         You don't get what you write. It is sent to another source.

A Transform stream is a duplex where the read and write takes place in a
causal way. The end points of the duplex stream are linked via some
transform. Read requires write to have occurred.

### Transform Stream
                        --------------|--------------
         You     Write  ---->                   ---->  Read  You
                        --------------|--------------
         You write something, it is transformed, then you read something.
- - -

The EUREKA there is the linear flow _input => output_ which a Transform
stream eases significantly, whereas Duplex feels a kind of bi-directional
beast.

## Install

This package is not yet published to any registry. You may install it anyway
using `npm`'s git support

```bash
npm install git+ssh://${REPOSITORY}
# or
npm install git+https://${REPOSITORY}
```

## Code example

```javascript
const IOStream = require('@iaigz/stream-io`)

// Ofc, we may pipe from any Readable source
process.stdin
  // Just pass data through
  .pipe(new IOStream('cat'))
  // Ofc, we may pipe to any Writable destination
  .pipe(process.stdout)
```

For a more complete - but also useless - example, see `example/jq.js`

## Test & Lint

A script is provided to run the suite. Once cloned, install deps and run it.

```bash
npm install

npm test
# or
bash script/test
bash script/lint
```

Linting is done with `standard`, so code style meets `standard` style.
