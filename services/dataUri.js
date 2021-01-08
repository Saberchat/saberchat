const DataUriParser = require('datauri/parser');
const path = require('path');

const parser = new DataUriParser();

const parseBuffer = (filename, buffer) => {
    return parser.format(path.extname(filename), buffer);
};

module.exports = parseBuffer;