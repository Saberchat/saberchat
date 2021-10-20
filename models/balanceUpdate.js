const mongoose = require("mongoose");

//Superclass Post schema
const BalanceUpdate = mongoose.model("BalanceUpdate", new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    oldAmount: Number,
    newAmount: Number,
    difference: Number
}, {timestamps: {createdAt: "created_at"}}));

module.exports = BalanceUpdate;