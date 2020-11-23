const dns = require("dns");
const net = require("net");

function checkEmail() {
	var email = null;
	var options = {};
	var callback = null;

	if (typeof arguments[0] === "string")
		email = arguments[0];

	if (typeof arguments[1] === "function")
		callback = arguments[1];
	else if (typeof arguments[1] === "object")
		options = arguments[1];

	if (!callback && typeof arguments[2] === "function")
		callback = arguments[2];

	var timeout = options.timeout || 5000;
	var fromEmail = options.fromEmail || email;
	var defaultExchange = options.defaultExchange ? options.defaultExchange : null;

	if (typeof callback !== "function")
		return callback(false, "Callback is not a function.");

	if (!(/^\S+@\S+$/).test(email))
		return callback(false, "Bad email format.");

	dns.resolveMx(email.split("@")[1], function (err, addresses) {
		if (err || addresses.length === 0) {
			callback(false, err);
			return;
		}

		var conn = net.createConnection(25, addresses[0].exchange);
		var commands = [
			`helo ${defaultExchange ? defaultExchange : addresses[0].exchange}`,
			`mail from: <${fromEmail}>`,
			`rcpt to: <${email}>`
		];
		var i = 0;

		conn.setEncoding("ascii");
		conn.setTimeout(timeout);

		conn.on("error", (err) => {
			conn.emit("false", err);
		});

		conn.on("false", (data) => {
			conn.end();

			if (email.endsWith("@yahoo.com"))
				return callback(true, null);

			if (data.startsWith("550 No RDNS entry for"))
				return callback(true, null);

			return callback(false, data);
		});

		conn.on("connect", () => {
			conn.on("prompt", (data) => {
				if (i < 3) {
					conn.write(commands[i]);
					conn.write("\r\n");
					i++;
				}
				else {
					conn.end();
					conn.destroy(); //destroy socket manually
					return callback(true, data);
				}
			});

			conn.on("undetermined", (data) => {
				//in case of an unrecognisable response tell the callback we're not sure
				conn.end();
				conn.destroy(); //destroy socket manually
				return callback(false, data);
			});

			conn.on("Timeout", () => {
				conn.end();
				conn.destroy();

				return callback(false, "Timeout");
			});

			conn.on("data", (data) => {
				//Handle *.gouv.fr email and other webserver not taking RCPT command
				if (data.indexOf("550") === 0 && data.indexOf("Protocol error") > 0) {
					conn.emit("prompt", data);
				}
				else if (data.indexOf("220") === 0 || data.indexOf("250") === 0 || data.indexOf("\n220") !== -1 || data.indexOf("\n250") !== -1) {
					conn.emit("prompt", data);
				}
				else if (data.indexOf("\n550") !== -1 || data.indexOf("550") === 0) {
					conn.emit("false", data);
				}
				else {
					conn.emit("undetermined", data);
				}
			});
		});
	});
}

/**
 * @typedef Options
 * @type {object}
 * @property {string} [timeout] - Milliseconds before timeout.
 * @property {string} [fromEmail] - Email to use for the test.
 * @property {number} [defaultExchange] - Default exchange mx to test email with (ex: mx.google.com).
 */

/**
 * Test if an email is valid and ready to received emails
 * 
 * @param {string} email - Email address to test
 * @param {Options} [options] - Options
 * @returns {Promise<Boolean>} - Success
 */
module.exports.check = (email, options) => {
	return new Promise((resolve, reject) => { //eslint-disable-line
		const args = [];

		if (email)
			args.push(email);

		if (options)
			args.push(options);

		args.push((success, message) => {
			success ? resolve(true) : reject(message);
		});

		checkEmail(...args);
	});
};
