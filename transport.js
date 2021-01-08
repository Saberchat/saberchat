const transport = ((transporter, recipient, subject, html) => {

  if (process.env.SENDING_EMAILS == "true" && recipient.receiving_emails) {
    let email = {
      from: 'noreply.saberchat@gmail.com',
      to: recipient.email,
      subject,
      html
    };

    transporter.sendMail(email, (err, info) => {
      if (error) {
        console.log(err);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }
});

//Emails which have to be sent (e.g. password reset)
const transport_mandatory = ((transporter, recipient, subject, html) => {

  let email = {
    from: 'noreply.saberchat@gmail.com',
    to: recipient.email,
    subject,
    html
  };

  transporter.sendMail(email, (err, info) => {
    if (error) {
      console.log(err);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});


module.exports = {
  transport,
  transport_mandatory
};
