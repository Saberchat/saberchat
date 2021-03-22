//Convert files to buffers (used with cloudinary uploads)

const DataUriParser = require('datauri/parser');
const path = require('path');

const parser = new DataUriParser();

module.exports.parseBuffer = function(filename, buffer) {
    return parser.format(path.extname(filename), buffer);
}