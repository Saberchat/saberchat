# email-existence

Checks existence of email addresses

## Installation

To install via npm:

    npm install @stationf/email-existence

### Requirements

A valid email address to check the existence of. Use [node-validator](https://github.com/chriso/node-validator) to check validity.

## Usage

*  Check existence:
```javascript
const emailExistence = require("@stationf/email-existence");

(async ()=> {
	try {
		let success = await emailExistence.check("mathieu@stationf.co");

		// With options => custom defaultExchange can avoid to get error 500 with gandi.net mx
		success = await emailExistence.check("mathieu@stationf.co", {
			fromEmail: "noreply@stationf.co",
			timeout: 3000,
			defaultExchange: "mx.google.com"
		});
	} catch (error) {
		console.log(error);
	}
})();
```

* The check function will return a boolean in response callback function to indicate existence of an email address. Existence is determined by telnetting to the MX server of the email domain and attempting to send an email to the supplied address. MX servers return 250 if the email address exists and 550 if it does not. This test email is not ever sent.
* The second callback parameter return error info or returned data.
