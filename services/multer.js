const multer = require('multer');
const path = require('path');
const util = require('util');

const storage = multer.memoryStorage();
const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extensions = [".png", ".jpg", ".jpeg", ".heic", ".gif", ".mp4", ".mp3", ".m4a", ".mov", ".pdf"]; //Supported filetypes
    if (!extensions.includes(ext)) {
        return callback(new Error(`"${ext}" files are not supported.`));
    }
    callback(null, true);
};

const multerConfig = {
    storage, fileFilter,
    limits: {fileSize: 7 * 10 ** 7}
};

//Functions to upload a single file and multiple files
module.exports.uploadSingle = util.promisify(multer(multerConfig).fields([{name: "mediaFile", maxCount: 1}]));
module.exports.uploadMultiple = util.promisify(multer(multerConfig).fields([
    {name: "mediaFile", maxCount: 10},
    {name: "mediaFile2", maxCount: 10}
]));
