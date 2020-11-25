import test from 'ava'
import rewire from 'rewire'
const emailChk = rewire('../index')

test('isEmail accepts valid emails', t => {
  const fn = emailChk.__get__('isEmail')

  t.true(fn('test@example.com'))
})

test('isEmail rejects invalid emails', t => {
  const fn = emailChk.__get__('isEmail')

  t.false(fn(1))
  t.false(fn('test.com'))
})

test('buildOptions applies defaults', t => {
  const fn = emailChk.__get__('buildOptions')

  const email = 'test@example.com'
  const expected = {
    email,
    emailHost: 'example.com',
    from: email,
    host: 'example.com',
    timeout: 5000
  }

  t.deepEqual(fn(email), expected)
})

test('buildOptions maintains provided options', t => {
  const fn = emailChk.__get__('buildOptions')

  const email = 'test@example.com'
  const options = {
    from: 'bob@example.com',
    host: 'example.com',
    timeout: 10000
  }
  const expected = Object.assign({}, options, { email, emailHost: 'example.com' })

  t.deepEqual(fn(email, options), expected)
})

test('getMailServerAddress returns lowest priority server address', t => {
  const fn = emailChk.__get__('getMailServerAddress')

  const servers = [
    { priority: 30, exchange: 'server-priority-30' },
    { priority: 10, exchange: 'server-priority-10' },
    { priority: 50, exchange: 'server-priority-50' }
  ]

  t.is(fn(servers), 'server-priority-10')
})

test('getMailServerAddress handles single server', t => {
  const fn = emailChk.__get__('getMailServerAddress')

  const servers = [
    { priority: 10, exchange: 'server-priority-10' }
  ]

  t.is(fn(servers), 'server-priority-10')
})

test('isValidError handles valid queryMx errors', t => {
  const fn = emailChk.__get__('isValidError')

  const ENOTFOUND = { syscall: 'queryMx', code: 'ENOTFOUND' }
  const ENODATA = { syscall: 'queryMx', code: 'ENODATA' }

  t.true(fn(ENOTFOUND))
  t.true(fn(ENODATA))
})

test('isValidError rejects invalid errors', t => {
  const fn = emailChk.__get__('isValidError')

  const INVALID = { syscall: 'invalid', code: 'invalid' }

  t.false(fn(INVALID))
})
