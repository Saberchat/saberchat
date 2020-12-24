const mongoose = require("mongoose");

//Specific statuses for users

var statusSchema = new mongoose.Schema({
  title: String,
  plural: String,
  version: String
});

module.exports = mongoose.model("Status", statusSchema);
