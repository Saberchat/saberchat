const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const courseSchema = Joi.object({
    title: Joi.string().required().max(100).escapeHtml().messages({
        "string.empty": "Title is required.",
        "string.max": "Title max 100 characters."
    }),
    thumbnail: Joi.allow(),
    description: Joi.string().required().min(50).escapeHtml().messages({
        "string.empty": "Description is required.",
        "string.min": "Descrip. minimum 50 characters."
    }),
    showThumbnail: Joi.string()
});

module.exports = {courseSchema};
