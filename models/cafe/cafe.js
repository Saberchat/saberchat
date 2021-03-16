const mongoose = require("mongoose");

//allows EC to regulate cafe openness
module.exports = mongoose.model("Cafe", new mongoose.Schema({
    open: {type: Boolean, default: false},
    revenue: {type: Number, default: 0},
    expenditures: {type: Number, default: 0},
    types: [{type: mongoose.Schema.Types.ObjectId, ref: 'ItemType'}]
}));
