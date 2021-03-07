const multer = require('multer');
const path = require('path');
const util = require('util');

const storage = multer.memoryStorage();
const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extensions = [".png", ".jpg", ".jpeg", ".heic", ".gif", ".mp4", ".mp3", ".m4a", ".mov", ".pdf"];
    if (!extensions.includes(ext)) {
        return callback(new Error(`"${ext}" files are not supported.`));
    }
    callback(null, true);
};

const multerConfig = {
    storage, fileFilter,
    limits: {fileSize: 7 * 10 ** 7}
};

module.exports.uploadSingle = util.promisify(multer(multerConfig).fields([{name: "imageFile", maxCount: 1}]));
module.exports.uploadMultiple = util.promisify(multer(multerConfig).fields([{name: "imageFile", maxCount: 10}]));
