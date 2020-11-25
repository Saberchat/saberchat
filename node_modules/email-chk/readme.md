# email-chk [![Build Status](https://travis-ci.org/brandon93s/email-chk.svg?branch=master)](https://travis-ci.org/brandon93s/email-chk)

> Checks if an email is valid & real by contacting the associated remote mail server  :email:

*See [email-chk-cli](https://github.com/brandon93s/email-chk-cli) for the command-line tool.*
## Install

```
$ npm install --save email-chk

```


## Usage

```js
const emailChk = require('email-chk')

try {
  const exists = await emailChk('test@example.com')
} 
catch (e) {
  // connection refused or server error occurred
}

// or
emailChk('test@example.com')
  .then(console.log)
  .catch(console.error)
```


## API

### emailChk(email [,options])

Returns a `boolean` representing if the email is valid & real

#### email

Type: `string`

The email to verify and check existence for


#### options

##### timeout

Type: `number`<br>
Default: `5000`

The [idle timeout](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) in ms for the socket performing requests 

##### host

Type: `string` <br>
Default: domain of `email`

The domain of the originating SMTP server for the request

##### from

Type: `string` <br>
Default: `email`

The originating email for the request

## Related

- [email-chk-cli](https://github.com/brandon93s/email-chk-cli) - CLI for this module 

## License

MIT © [Brandon Smith](https://github.com/brandon93s)
