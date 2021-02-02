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
    moderate: Joi.boolean(),
    type: Joi.boolean(),
    check: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkAdd: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkRemove: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')])
});

module.exports = {chatSchema};
