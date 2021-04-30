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

const compressVideo = async function(buffer) {
    const cp = require("child_process");
    let process = cp.spawn("ffmpeg", [
        "-i", "-",
        "-vcodec", "libx264",
        "-crf", "24",
        "-f", "mp4",
        "-"
    ]);
    process.stdin.write(buffer);
    process.stdin.end();
    
}

module.exports.autoCompress = async function(fileName, fileBuffer) {
    const ext = path.extname(fileName).toLowerCase();
    if([".png", ".jpg", ".jpeg"].includes(ext)) {
        try {
            if (process.env.DEBUG === "true") {
                console.log("DMITRY-DEBUG: attempting to compress image...");
            }
            let originalSize = fileBuffer.byteLength;
            let compressedBuffer = await compressImage(fileBuffer);
            let compressedSize = compressedBuffer.byteLength;
            if (process.env.DEBUG === "true") {
                console.log("Image compression results:")
                console.log("Original:", originalSize);
                console.log("Compressed:", compressedSize);
                console.log("Ratio:", compressedSize/originalSize);
            }
            return compressedBuffer;
        } catch(e) {
            console.warn("An error occurred while compressing image: ");
            console.error(e);
            return fileBuffer;
        }
    } else if ([".mp4"].includes(ext)) {
        return fileBuffer; //placeholder
        try {
            if (process.env.DEBUG === "true") {
                console.log("DMITRY-DEBUG: attempting to compress video...");
            }
            let originalSize = fileBuffer.byteLength;
            let compressedBuffer = await compressImage(fileBuffer);
            let compressedSize = compressedBuffer.byteLength;
            if (process.env.DEBUG === "true") {
                console.log("Video compression results:")
                console.log("Original:", originalSize);
                console.log("Compressed:", compressedSize);
                console.log("Ratio:", compressedSize/originalSize);
            }
            return compressedBuffer;
        } catch(e) {
            console.warn("An error occurred while compressing video: ");
            console.error(e);
            return fileBuffer;
        }
    }
    return fileBuffer;
}