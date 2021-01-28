const BaseJoi = require('joi');
const { escapeHtmlExtension } = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const msgSchema = Joi.object({
    subject: Joi.string().required().max(100).escapeHtml().messages({
        "string.empty": "Subject is required.",
        "string.max": "Subject max 100 characters."
    }),
    message: Joi.string().required().max(500).escapeHtml().messages({
        "string.empty": "Message is required.",
        "string.max": "Message max 500 characters."
    }),
    recipients: Joi.string().escapeHtml(),
    all: Joi.boolean().valid(true),
    anonymous: Joi.boolean().valid(true),
    noreply: Joi.boolean().valid(true),
    images: Joi.array().items(Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/))).messages({
        "string.pattern.base": "Image Urls should be https links"
    })
}).xor('recipients', 'all').messages({
    "object.missing": 'Please select recipients or "everyone".'
});

module.exports = {
    msgSchema
};
