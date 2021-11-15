const imagemin = require("imagemin");
const imageminJPEGTran = require('imagemin-jpegtran');
const imageminPNGQuant = require('imagemin-pngquant');
const path = require("path");

const compressImage = async function(buffer) { //Compess image file
    return await imagemin.buffer(buffer, { //Return buffer for compressed image
        plugins: [
            imageminJPEGTran(),
            imageminPNGQuant({quality: [0.3, 0.5]}) //Represent shrunk quality
        ]
    });
}

const compressVideo = async function(buffer) { //Compress video file
    const cp = await require("child_process");
    let process = await cp.spawn("ffmpeg", [ //Compress calls
        "-i", "-",
        "-vcodec", "libx264",
        "-crf", "24",
        "-f", "mp4",
        "-"
    ]);
    await process.stdin.write(buffer);
    await process.stdin.end();
}

module.exports.autoCompress = async function(fileName, fileBuffer) { //Evaluate file and compress either way
    const ext = await path.extname(fileName).toLowerCase();
    if([".png", ".jpg", ".jpeg"].includes(ext)) { //Check for image filetype
        try { //Attempt compression
            if (process.env.DEBUG === "true") {await console.log("DEBUG: attempting to compress image...");}
            let originalSize = fileBuffer.byteLength;
            let compressedBuffer = await compressImage(fileBuffer); //Form buffer of compressed data
            let compressedSize = compressedBuffer.byteLength;
            if (process.env.DEBUG === "true") {await console.log("Image compression successful")}
            return compressedBuffer;
        } catch(e) {
            await console.warn("An error occurred while compressing image: ");
            await console.error(e);
            return fileBuffer;
        }
    } else if ([".mp4"].includes(ext)) { //Check for video filetype
        return fileBuffer; //placeholder
        try {
            if (process.env.DEBUG === "true") {
                console.log("DEBUG: attempting to compress video...");
            }
            let originalSize = fileBuffer.byteLength;
            let compressedBuffer = await compressImage(fileBuffer);
            let compressedSize = compressedBuffer.byteLength;
            if (process.env.DEBUG === "true") {await console.log("Video compression successful")}
            return compressedBuffer;
        } catch(e) {
            await console.warn("An error occurred while compressing video: ");
            await console.error(e);
            return fileBuffer;
        }
    }
    return fileBuffer;
}