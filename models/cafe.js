const mongoose = require("mongoose");

//allows EC to regulate cafe openness

var cafeSchema = new mongoose.Schema({
    open: Boolean
  })

module.exports = mongoose.model("Cafe", cafeSchema);
