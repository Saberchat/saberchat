const mongoose = require('mongoose');

var accessReqSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    text: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("AccessRequest", accessReqSchema);
