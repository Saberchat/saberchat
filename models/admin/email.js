const mongoose = require("mongoose");

//keeps track of all emails in whitelist

var emailSchema = new mongoose.Schema({
    address: String,
    version: {type: String, default: 'whitelist'}
});

module.exports = mongoose.model("Email", emailSchema);
