const nodemailer = require("nodemailer");

const transport = ((recipient, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'noreply.saberchat@gmail.com',
      pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
    }
  });

  if (process.env.SENDING_EMAILS == "true" && recipient.receiving_emails) {
    let email = {from: 'noreply.saberchat@gmail.com', to: recipient.email, subject, html};

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
      user: 'noreply.saberchat@gmail.com',
      pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
    }
  });

  let email = {from: 'noreply.saberchat@gmail.com', to: recipient.email, subject, html};

  transporter.sendMail(email, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

module.exports = {transport, transport_mandatory};
