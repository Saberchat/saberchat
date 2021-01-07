const multer = require('multer');
const path = require('path');
const util = require('util');

const storage = multer.memoryStorage();
const imageFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname);
    if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
        return callback(new Error('Invalid image format!'));
    }
    callback(null, true);
};

const multerConfig = {
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 3 * 10**6
    }
};

// const multerUpload = util.promisify(multer(multerConfig).single('imageFile'));

// module.exports = multerUpload;

module.exports = multer(multerConfig).single('imageFile');