const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const annSchema = Joi.object({
    subject: Joi.string().required().max(50).escapeHtml().messages({
        "string.empty": "Subject is required.",
        "string.max": "Subject max 50 characters."
    }),
    message: Joi.allow(),
    images: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)))).messages({
        "string.pattern.base": "Image URLs should be https links"
    }),
    deleteUpload: Joi.boolean(),
    public: Joi.boolean()
});

module.exports = {annSchema};
