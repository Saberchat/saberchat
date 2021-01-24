// if(process.env.NODE_ENV !== "production") {
// 	require('dotenv').config();
// }

const nodemailer = require("nodemailer");

const transport = ((recipient, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
			user: "noreply.saberchat@gmail.com",
			pass: "Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9"
      // user: process.env.EMAIL_ADDRESS,
      // pass: process.env.EMAIL_PASSWORD
    }
  });

  if (process.env.SENDING_EMAILS == "true" && recipient.receiving_emails) {
		let email = {from: "noreply.saberchat@gmail.com", to: recipient.email, subject, html};
    // let email = {from: process.env.EMAIL_ADDRESS, to: recipient.email, subject, html};

    transporter.sendMail(email, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }
});

//Emails which have to be sent (e.g. password reset)
const transport_mandatory = ((recipient, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
			user: "noreply.saberchat@gmail.com",
			pass: "Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9"
      // user: process.env.EMAIL_ADDRESS,
      // pass: process.env.EMAIL_PASSWORD
    }
  });

  // let email = {from: process.env.EMAIL_ADDRESS, to: recipient.email, subject, html};
	let email = {from: "noreply.saberchat@gmail.com", to: recipient.email, subject, html};

  transporter.sendMail(email, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

module.exports = {transport, transport_mandatory};
