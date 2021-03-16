const mongoose = require('mongoose');

//Access request to join chat rooms
module.exports = mongoose.model("AccessRequest", new mongoose.Schema({
    requester: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'},
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    text: String,
    status: {type: String, default: 'pending'}
}, {timestamps: {createdAt: 'created_at'}
}));
