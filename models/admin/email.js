const mongoose = require("mongoose");

//keeps track of all emails in accesslist and blockedlist
var emailSchema = new mongoose.Schema({
    address: String,
    version: {type: String, default: 'accesslist'}
});

module.exports = mongoose.model("Email", emailSchema);
