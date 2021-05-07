const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const chatSchema = Joi.object({
    name: Joi.string().required().max(45).escapeHtml().messages({
        "string.empty": "Room name is required.",
        "string.max": "Room name max 45 characters."
    }),
    description: Joi.string().allow('').max(500).escapeHtml().messages({
        "string.max": "Descrip. max 500 characters."
    }),
    thumbnail: Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)).required().allow('').messages({
        "string.empty": "Thumbnail url is required.",
        "string.pattern.base": "Image Url should be an https link."
    }),
    showThumbnail: Joi.string(),
    moderate: Joi.boolean(),
    type: Joi.boolean(),
    check: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkAdd: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkRemove: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')])
});

module.exports = {chatSchema};
