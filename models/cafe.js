const mongoose = require("mongoose");

//allows EC to regulate cafe openness

var cafeSchema = new mongoose.Schema({
  open: {type: Boolean, default: false},
  revenue: {type: Number, default: 0},
  expenditures: {type: Number, default: 0}
})

module.exports = mongoose.model("Cafe", cafeSchema);
