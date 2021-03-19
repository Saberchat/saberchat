module.exports = async function(schema) { //Set up data for platform, cafe, etc.
    const object = await schema.findOne({});
    if (!object) { return null;}
    return object;
}