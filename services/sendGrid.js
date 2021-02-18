if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const axios = require('axios');

module.exports.sendGridEmail = async function(email, subject, content, mandatory) {
    if(process.env.SENDING_EMAILS === 'true' || mandatory) {
        const url = process.env.SENDGRID_BASE_URL + '/mail/send';
        const data = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": email
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
                    "value": content
                }
            ]
        }

        const response = await axios({
            method: 'post',
            url: url,
            data: data,
            headers: {
                "Authorization": "Bearer " + process.env.SENDGRID_KEY
            }
        });
        console.log(`Email Sent with status code: ${response.status}`);
    }
}
