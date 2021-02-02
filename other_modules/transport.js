if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

// const nodemailer = require("nodemailer");
const axios = require('axios');

const transport = (recipient, subject, html) => {
    if (process.env.SENDING_EMAILS == "true" && recipient.receiving_emails) {
        const url = process.env.SENDGRID_BASE_URL + '/mail/send';
        const data = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": recipient.email
                        }
                    ],
                    "subject": subject
                }
            ],
            "from": {
                "email": "noreply.saberchat@gmail.com",
                "name": "SaberChat"
            },
            "content": [
                {
                    "type": "text/html",
                    "value": html
                }
            ]
        }

        axios({
            method: 'post',
            url: url,
            data: data,
            headers: {
                "Authorization": "Bearer " + process.env.SENDGRID_KEY
            }
        }).then(response => {
            console.log(`Email Sent with status code: ${response.status}`);
        }).catch(error => {
            console.log(error);
        });
    }
};

const transport_mandatory = (recipient, subject, html) => {
    const url = process.env.SENDGRID_BASE_URL + '/mail/send';
    const data = {
        "personalizations": [
            {
                "to": [
                    {
                        "email": recipient.email
                    }
                ],
                "subject": subject
            }
        ],
        "from": {
            "email": "noreply.saberchat@gmail.com",
            "name": "SaberChat"
        },
        "content": [
            {
                "type": "text/html",
                "value": html
            }
        ]
    }

    axios({
        method: 'post',
        url: url,
        data: data,
        headers: {
            "Authorization": "Bearer " + process.env.SENDGRID_KEY
        }
    }).then(response => {
        console.log(`Email Sent with status code: ${response.status}`);
    }).catch(error => {
        console.log(error);
    });
};


module.exports = {transport, transport_mandatory};
