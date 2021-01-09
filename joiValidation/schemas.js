const BaseJoi = require('joi');
const { escapeHtmlExtension } = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const annSchema = Joi.object({
    subject: Joi.string().required().max(30).escapeHtml(),
    message: Joi.string().required().escapeHtml(),
    images: Joi.array().items(Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/))).messages({
        "string.pattern.base": "Image Urls should be https links"
    }),
    deleteUpload: Joi.boolean()
});

const newUserSchema = Joi.object({
    firstName: Joi.string().required().max(50).min(2).escapeHtml().messages({
        "string.empty": "Firstname is required.",
        "string.max": "Firstname max 50 characters.",
        "string.min": "Firstname minimum 2 characters."
    }),
    lastName: Joi.string().required().max(50).min(2).escapeHtml().messages({
        "string.empty": "Lastname is required.",
        "string.max": "Lastname max 50 characters.",
        "string.min": "Lastname minimum 2 characters."
    }),
    username: Joi.string().required().max(23).escapeHtml().messages({
        "string.empty": "Username is required.",
        "string.max": "Username max 23 characters."
    }),
    email: Joi.string().email().required().escapeHtml().messages({
        "string.empty": "Email is required.",
        "string.email": "Invalid Email."
    }),
    password: Joi.string().required().min(8).escapeHtml().messages({
        "string.empty": "Password is required.",
        "string.min": "Password minimum 7 characters."
    })
});

const userLoginSchema = Joi.object({
    email: Joi.string().email().required().escapeHtml().messages({
        "string.empty": "Email is required.",
        "string.email": "Invalid Email."
    }),
    password: Joi.string().required().min(8).escapeHtml().messages({
        "string.empty": "Password is required.",
        "string.min": "Password minimum 7 characters."
    })
});

module.exports = {
    annSchema,
    newUserSchema,
    userLoginSchema
};