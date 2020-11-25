'use strict'

const net = require('net')
const dns = require('dns')
const promisify = require('pify')
const emailRegex = require('email-regex')({ exact: true })
const resolveMx = promisify(dns.resolveMx)

module.exports = (email, options) => {
  if (!isEmail(email)) {
    return Promise.resolve(false)
  }

  options = buildOptions(email, options)

  return new Promise((resolve, reject) => {
    resolveMx(options.emailHost)
      .then(getMailServerAddress)
      .then(address => checkEmail(options, address))
      .then(result => resolve(result))
      .catch(error => {
        if (isValidError(error)) {
          resolve(false)
          return
        }
        reject(error)
      })
  })
}

const isEmail = email => {
  if (typeof email !== 'string') return false
  if (!emailRegex.test(email)) return false

  return true
}

const buildOptions = (email, options) => {
  email = email.toLowerCase()

  options = options || {}
  options.email = email
  options.emailHost = email.split('@')[1]
  options.from = options.from || email
  options.host = options.host || options.emailHost
  options.timeout = options.timeout || 5000

  return options
}

const getMailServerAddress = addresses => {
  const targetIndex = addresses.reduce((lowestPriorityIndex, currentAddress, currentIndex) => {
    return currentAddress.priority < addresses[lowestPriorityIndex].priority ? currentIndex : lowestPriorityIndex
  }, 0)

  return addresses[targetIndex].exchange
}

const checkEmail = (options, address) => {
  let messages = [
    `helo ${options.host}\n`,
    `mail from:<${options.from}>\n`,
    `rcpt to:<${options.email}>\n`
  ]

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(25, address)

    const cleanup = () => {
      if (!socket.destroyed) socket.destroy()
    }

    const onError = error => {
      cleanup()
      reject(error)
    }

    socket.on('error', onError)

    socket.setTimeout(options.timeout, () => onError(new Error(`Timeout expired (${options.timeout})`)))

    socket.on('data', (data) => {
      const response = data.toString()
      const isDone = messages.length === 0
      const isSuccess = response[0] === '2'

      if (isDone) {
        cleanup()
        resolve(isSuccess)
        return
      }

      if (!isSuccess) {
        onError(new Error('Remote server refused requests'))
        return
      }

      socket.write(messages.shift())
    })
  })
}

const isValidError = error => {
  if (error.syscall === 'queryMx') {
    if (error.code === 'ENOTFOUND') return true
    if (error.code === 'ENODATA') return true
  }

  return false
}
