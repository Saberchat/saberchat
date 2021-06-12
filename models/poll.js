const mongoose = require("mongoose");

module.exports = mongoose.model('Poll', new mongoose.Schema({
    title: String,
    description: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    questions: [
        {
            id: Number,
            text: String,
            options:[
                {
                    type: String
                }
            ]
        }
    ],
    responses: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            response: [
                {
                    id: Number,
                    answer: String
                }
            ]
        }
    ]
}, {
    timestamps: {createdAt: 'created_at'}
}));