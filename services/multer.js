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
    limits: {fileSize: 3 * 10 ** 8}
};

let singleFields = [{name: "imageFile", maxCount: 1}];
let multipleFields = [{name: "imageFile", maxCount: 7}];

for (let i = 2; i <= 7; i++) {
    singleFields.push({name: `imageFile${i}`, maxCount: 1});
    multipleFields.push({name: `imageFile${i}`, maxCount: 7});
}

module.exports.uploadSingle = util.promisify(multer(multerConfig).fields(singleFields));
module.exports.uploadMultiple = util.promisify(multer(multerConfig).fields(multipleFields));
