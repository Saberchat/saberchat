const BaseJoi = require('joi');
const {escapeHtmlExtension} = require('./extensions');

const Joi = BaseJoi.extend(escapeHtmlExtension);

const postCommentSchema = Joi.object({
    text: Joi.string().allow('').max(500).escapeHtml().messages({
        "string.max": "Descrip. max 500 characters."
    }),
    announcement: Joi.string().allow(''),
    project: Joi.string().allow(''),
    course: Joi.string().allow(''),
    article: Joi.string().allow(''),
    tutorId: Joi.string().allow(''),
    rating: Joi.number()
});

module.exports = {postCommentSchema};
