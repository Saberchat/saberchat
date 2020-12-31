require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const util = require('util');

cloudinary.config({
    cloud_name:"dhifj0kpt",
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// const options = {
//     folder: 'SaberChat'
// };
// const cloudUpload = file => {
//     let err;
//     let result;
//     cloudinary.uploader.upload(file, options, (err, result) => {
//         err = err;
//         result = result;
//     });
//     return [err, result];
// };
const cloudUploader = util.promisify(cloudinary.uploader.upload);

module.exports = cloudUploader;