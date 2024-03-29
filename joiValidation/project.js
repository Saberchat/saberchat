const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const projectSchema = Joi.object({
    title: Joi.string().required().max(50).escapeHtml().messages({
        "string.empty": "Title is required.",
        "string.max": "Title max 50 characters."
    }),
    text: Joi.allow(),
    creatorInput: Joi.string().allow('').required().escapeHtml(),
    images: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)))).messages({
        "string.pattern.base": "Image URLs should be https links"
    }),
});

module.exports = {projectSchema};
