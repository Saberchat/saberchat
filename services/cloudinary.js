if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const parseBuffer = require('./dataUri');
const cloudinary = require('cloudinary').v2;
const util = require('util');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const cloudUploader = util.promisify(cloudinary.uploader.upload);
const cloudDestroyer = util.promisify(cloudinary.uploader.destroy);

const cloudUpload = async (file) => {
    // turn buffer into file
    const imgFile = parseBuffer(file.originalname, file.buffer).content;

    // upload to cloudinary
    const options = {
        folder: 'SaberChat'
    };
    let error;
    let cResult;
    await cloudUploader(imgFile, options)
        .then(result => {
            cResult = result;
        })
        .catch(err => {
            error = err;
        });

    return [error, cResult];
};

const cloudDelete = async (filename) => {
    let cResult;
    let error;
    // delete image
    await cloudDestroyer(filename)
        .catch(err => {
            error = err;
        })
        .then(result => {
            cResult = result;
        });

    return [error, cResult];
};

module.exports = {
    cloudUpload: cloudUpload,
    cloudDelete: cloudDelete
};