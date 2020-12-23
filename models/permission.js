//MIGHT NOT USE FOR NOW. KEEP IN CASE

const mongoose = require("mongoose");

//Specific statuses for users

var permissionSchema = new mongoose.Schema({
  title: String
});

module.exports = mongoose.model("Permission", permissionSchema);
