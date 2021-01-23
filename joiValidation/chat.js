const BaseJoi = require('joi');
const { escapeHtmlExtension } = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const chatSchema = Joi.object({
    name: Joi.string().required().max(45).escapeHtml().messages({
        "string.empty": "Room name is required.",
        "string.max": "Room name max 45 characters."
    }),
    description: Joi.string().required().max(300).escapeHtml().messages({
        "string.empty": "Descrip. is required.",
        "string.max": "Descrip. max 300 characters."
    }),
    moderate: Joi.boolean(),
    type: Joi.boolean(),
    check: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkAdd: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')]),
    checkRemove: Joi.object().pattern(/^[a-f\d]{24}$/, [Joi.string().valid('')])
});

module.exports = {
    chatSchema
};