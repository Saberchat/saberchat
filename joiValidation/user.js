const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

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

const loginUserSchema = Joi.object({
    email: Joi.string().email().required().escapeHtml().messages({
        "string.empty": "Email is required.",
        "string.email": "Invalid Email."
    }),
    password: Joi.string().required().min(8).escapeHtml().messages({
        "string.empty": "Password is required.",
        "string.min": "Password minimum 7 characters."
    }),
    newPwdEmail: Joi.string().allow('')
});

const updateUserSchema = Joi.object({
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
    description: Joi.string().allow('').required().max(550).escapeHtml().messages({
        "string.max": "Description max 550 characters."
    }),
    title: Joi.string().allow('').required().max(50).escapeHtml().messages({
        "string.max": "Title max 50 characters."
    }),
    status: Joi.string().required().allow(''),
    tags: Joi.string().allow(''),
    imageUrl: Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)).required().messages({
        "string.empty": "Profile image url is required.",
        "string.pattern.base": "Image Url should be an https link."
    }),
    bannerUrl: Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)).required().messages({
        "string.empty": "Banner image url is required.",
        "string.pattern.base": "Banner Url should be an https link."
    }),
    showProfileImage: Joi.string(),
    showBannerImage: Joi.string()
});

const resetPasswordSchema = Joi.object({
    email: Joi.string().allow(''),
    password: Joi.string().allow(''),
    newPwdEmail: Joi.string().email().required().escapeHtml().messages({
        "string.empty": "Email is required.",
        "string.email": "Invalid Email."
    })
});

const updateEmailSchema = Joi.object({
    email: Joi.string().email().required().escapeHtml().messages({
        "string.empty": "Email is required.",
        "string.email": "Invalid Email."
    }),
    receiving_emails: Joi.string().valid('on')
});

const updatePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().min(8).escapeHtml().messages({
        "string.empty": "Old password is required.",
        "string.min": "Old password min 8 characters."
    }),
    newPassword: Joi.string().required().min(8).escapeHtml().messages({
        "string.empty": "New password is required.",
        "string.min": "New password min 8 characters."
    }),
    newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        "string.empty": "Repeat password is required.",
        "any.only": "New passwords should be the same."
    })
});

module.exports = {
    newUserSchema,
    loginUserSchema,
    updateUserSchema,
    resetPasswordSchema,
    updateEmailSchema,
    updatePasswordSchema
};
