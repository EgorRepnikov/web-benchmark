const autocannon = require('autocannon')
const { spawn } = require('child_process')
const { StringDecoder } = require('string_decoder')

const subjects = require('../settings/subjects')
const printer = require('./printer')

function bench(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

function handleCloseWithError(process, name) {
  process.on('close', (code) => {
    if (code !== null && code !== 130) {
      printer.error('\r\n', name, 'process exit with code', code, '\r\n')
    }
  })
}

function waitSignal(process, signal) {
  const decoder = new StringDecoder()
  return new Promise((resolve) => {
    process.stdout.on('data', (chunk) => {
      if (decoder.write(chunk).startsWith(signal)) {
        resolve()
      }
    })
  })
}

module.exports = async function run(opts) {
  const results = new Map()
  for (const name of Object.keys(subjects)) {
    const process = spawn(subjects[name].command, subjects[name].args)
    handleCloseWithError(process, name)
    await waitSignal(process, subjects[name].signal)
    printer.info('Start', name)
    results.set(name, await bench(opts))
    printer.info('End', name, '\r\n')
    process.kill('SIGINT')
  }
  return results
}