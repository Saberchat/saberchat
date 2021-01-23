const sanitizeHtml = require('sanitize-html');

module.exports.escapeHtmlExtension = (joi) => {
    return {
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHtml': '{{#label}} must not include HTML.'
    },
    rules: {
        escapeHtml: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {}
                });
                if(clean !== value) {
                    return helpers.error('string.escapeHtml', { value });
                }
                return clean;
            }
        }
    }
}};