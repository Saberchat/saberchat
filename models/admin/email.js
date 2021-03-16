const mongoose = require("mongoose");

//keeps track of all emails in Access List and Blocked List
module.exports = mongoose.model("Email", new mongoose.Schema({
    address: String,
    version: {type: String, default: 'accesslist'}
}));