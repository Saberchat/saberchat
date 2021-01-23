const BaseJoi = require('joi');
const { escapeHtmlExtension } = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const annSchema = Joi.object({
    subject: Joi.string().required().max(30).escapeHtml().messages({
        "string.empty": "Subject is required.",
        "string.max": "Subject max 30 characters."
    }),
    message: Joi.string().required().escapeHtml().messages({
        "string.empty": "Message is required."
    }),
    images: Joi.array().items(Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/))).messages({
        "string.pattern.base": "Image Urls should be https links"
    }),
    deleteUpload: Joi.boolean()
});

module.exports = {
    annSchema
};