const imagemin = require("imagemin");
const imageminJPEGTran = require('imagemin-jpegtran');
const imageminPNGQuant = require('imagemin-pngquant');
const path = require("path");

const compressImage = async function(buffer) {
    return await imagemin.buffer(buffer, {
        plugins: [
            imageminJPEGTran(),
            imageminPNGQuant({quality: [0.3, 0.5]})
        ]
    });
}

module.exports.autoCompress = async function(fileName, fileBuffer) {
    const ext = path.extname(fileName).toLowerCase();
    if([".png", ".jpg", ".jpeg"].includes(ext)) {
        try {
            console.log("DMITRY-DEBUG: attempting to compress image...");
            let originalSize = fileBuffer.byteLength;
            let compressedBuffer = await compressImage(fileBuffer);
            let compressedSize = compressedBuffer.byteLength;
            console.log("Original:", originalSize);
            console.log("Compressed:", compressedSize);
            console.log("Ratio:", compressedSize/originalSize);
            return compressedBuffer;
        } catch(e) {
            console.log("An error occurred while compressing image: ");
            console.error(e);
            return fileBuffer;
        }
    }
    return fileBuffer;
}