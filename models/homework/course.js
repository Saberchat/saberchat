const mongoose = require('mongoose');

//Course schema stores information for tutoring center courses
module.exports = mongoose.model("Course", new mongoose.Schema({
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
        url: {type: String, default: "https://img.freepik.com/free-vector/empty-school-class-background-video-conferences_23-2148715222.jpg?size=626&ext=jpg"},
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
        price: Number,
        bio: String,
        dateJoined: Date,
        students: [{
            student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            lessons: [{time: Number, date: String, summary: String}],
            room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'}
        }],
        formerStudents: [{
            student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            lessons: [{time: Number, date: String, summary: String}],
        }],
        upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        reviews: [{
            review: {type: mongoose.Schema.Types.ObjectId, ref: 'PostComment'},
            rating: Number
        }],
    }],
}, {timestamps: {createdAt: 'created_at'}
}));
