const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: String,
    joinCode: String,
    description: String,
    thumbnailFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    },
    thumbnail: {
        url: {type: String, default: "https://alsionschool.org/images/community/gallery/Beach.jpg"},
        display: {type: Boolean, default: true}
    },
    active: {type: Boolean, default: true},
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    students: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    blocked: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    tutors: [{
        tutor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        slots: {type: Number, default: 0},
        available: {type: Boolean, default: true},
        bio: String,
        dateJoined: Date,
        students: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        formerStudents: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        rooms: [{
            student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'}
        }],
        lessons: [{
            student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            time: Number,
            date: String,
            summary: String
        }],
        reviews: [{
            review: {type: mongoose.Schema.Types.ObjectId, ref: 'PostComment'},
            rating: Number
        }],
    }],
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Course', courseSchema);
