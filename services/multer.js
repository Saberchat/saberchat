const multer = require('multer');
const path = require('path');
const util = require('util');

const storage = multer.memoryStorage();
const imageFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname);
    const extensions = [".png", ".jpg", ".jpeg", ".mp4"];
    if (!extensions.includes(ext.toLowerCase())) {
        return callback(new Error('Invalid Media Format'));
    }
    callback(null, true);
};

const multerConfig = {
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 3 * 10 ** 8
    }
};

const uploadSingle = util.promisify(multer(multerConfig).single("imageFile"));
const uploadMultiple = util.promisify(multer(multerConfig).array("imageFile", 3)); //Max 3 uploads (might change, discuss as a team)

module.exports = {uploadSingle, uploadMultiple};
