if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const {parseBuffer} = require('./dataUri');
const cloudinary = require('cloudinary').v2;
const util = require('util');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const cloudUploader = util.promisify(cloudinary.uploader.upload);
const cloudDestroyer = util.promisify(cloudinary.uploader.destroy);

module.exports.cloudUpload = async function (file, type) {
    const imgFile = parseBuffer(file.originalname, file.buffer).content; // turn file into buffer
    const options = {folder: 'SaberChat'}; // upload to cloudinary
    if (type == "video") {
        options.resource_type = type;
    }

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
}

module.exports.cloudDelete = async function(filename, type) {
    let cResult;
    let error;
    const options = {};
    if (type == "video") { //Video requires differnt parameters
        options.resource_type = type;
    }
    await cloudDestroyer(filename, options) // delete media
        .catch(err => {
            error = err;
        })
        .then(result => {
            cResult = result;
        });

    return [error, cResult];
}
