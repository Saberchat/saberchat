const mongoose = require("mongoose");

//Superclass group schema, to be implemented with chat rooms, courses, etc.
const Group = mongoose.model("Group", new mongoose.Schema({
    name: String,
    description: {type: String, default: ""},
    private: {type: Boolean, default: false},
    date: String,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    blocked: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    imageUrl: {
        url: {type: String, default: "https://wallpaper.dog/large/11001671.jpg"},
        display: {type: Boolean, default: true}
    },
    imageFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    }
}, {timestamps: {createdAt: 'created_at'}
}));

module.exports = {
    Room: Group.discriminator("ChatRoom", new mongoose.Schema({ //Chat rooms
        moderate: {type: Boolean, default: true},
        mutable: {type: Boolean, default: true},
        confirmed: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
        comments: [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
    })),

    Course: Group.discriminator("Course", new mongoose.Schema({ //Tutoring center courses
        joinCode: String,
        active: {type: Boolean, default: true},
        tutors: [{
            tutor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            slots: {type: Number, default: 0},
            available: {type: Boolean, default: true},
            price: {type: Number, default: 20},
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
    })),
};