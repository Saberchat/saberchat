const mongoose = require("mongoose");

//keeps track of all emails in whitelist

var emailSchema = new mongoose.Schema({
    address: String
  })

module.exports = mongoose.model("Email", emailSchema);
