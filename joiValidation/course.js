const BaseJoi = require('joi');
const { escapeHtmlExtension } = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const courseSchema = Joi.object({
    title: Joi.string().required().max(100).escapeHtml().messages({
        "string.empty": "Title is required.",
        "string.max": "Title max 100 characters."
    }),
    thumbnail: Joi.string().pattern(new RegExp(/https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)).required().messages({
        "string.empty": "Thumbnail url is required.",
        "string.pattern.base": "Thumbnail Url should be an https link."
    }),
    description: Joi.string().required().min(50).escapeHtml().messages({
        "string.empty": "Description is required.",
        "string.min": "Descrip. minimum 50 characters."
    }),
});

module.exports = {courseSchema};
