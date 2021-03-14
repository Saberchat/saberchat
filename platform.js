const Platform = require('./models/platform')

module.exports = async function() { //Set up platform data
    const platform = await Platform.findOne({});
    if (!platform) { return null;}
    return platform;
}