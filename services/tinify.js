if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const tinify = require('tinify');
const util = require('util')
const path = require('path');
tinify.key = process.env.TINIFY_KEY;

async function compressImage(buffer) {
    console.log("DMITRY-DEBUG: If you are seeing this, it means that the deprecated tinify.js compressor script is being used.")
    let results = {};
    await new Promise((resolve, reject) => {
        tinify.fromBuffer(buffer).toBuffer((err, resultData)=> {
            if(err) {
                reject(err);
            } else {
                resolve(resultData)
            }
        });
    }).then((resultData) => {
        results.success = true;
        results.buffer = resultData;
    }).catch((err) => {
        results.success = false;
        results.buffer = null;
        console.log(err);
    });
    return results;
}

// compresses image if possible, else just returns original buffer
module.exports.autoCompress = async function(fileName, fileBuffer) {
    const ext = path.extname(fileName).toLowerCase();
    if([".png", ".jpg", ".jpeg"].includes(ext)) {
        const results = await compressImage(fileBuffer);
        if(results.success) {
            return results.buffer;
        }
    }
    return fileBuffer;
}
