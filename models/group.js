const mongoose = require("mongoose");

//Superclass group schema, to be implemented with chat rooms, courses, etc.
const Group = mongoose.model("Group", new mongoose.Schema({
    name: String,
    description: {type: String, default: ""},
    private: {type: Boolean, default: false},
    date: String,
    joinCode: String,
    active: {type: Boolean, default: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    blocked: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    thumbnail: {
        url: {type: String, default: "https://cdn.osxdaily.com/wp-content/uploads/2009/08/defaultdesktop.jpg"},
        display: {type: Boolean, default: true}
    },
    thumbnailFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    }
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: "type"
}));

module.exports = { //All subclasses

    //SUBCLASSES WITH APPENDED FIELDS
    ChatRoom: Group.discriminator("ChatRoom", new mongoose.Schema({ //Chat rooms
        moderate: {type: Boolean, default: true},
        mutable: {type: Boolean, default: true},
        confirmed: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
        comments: [{type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage"}]
    })),
    PostOrg: Group.discriminator("PostOrg", new mongoose.Schema({ //For organizations like wHeights that post content without profit
        categories: [{type: mongoose.Schema.Types.ObjectId, ref: "PostCategory"}]
    })),
    Market: Group.discriminator("Market", new mongoose.Schema({ //Shop, Fundraising Platforms, etc.
        open: {type: Boolean, default: false},
        revenue: {type: Number, default: 0},
        expenditures: {type: Number, default: 0},
        categories: [{type: mongoose.Schema.Types.ObjectId, ref: "ItemCategory"}]
    })),
    Course: Group.discriminator("Course", new mongoose.Schema({ //Tutoring center courses
        tutors: [{
            tutor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            slots: {type: Number, default: 0},
            available: {type: Boolean, default: true},
            cost: {type: Number, default: 20},
            bio: String,
            dateJoined: Date,
            members: [{
                student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
                lessons: [{
                    time: Number, date: String, summary: String,
                    approved: {type: Boolean, default: false},
                    paid: {type: Boolean, default: false}
                }],
                room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'}
            }],
            formerStudents: [{
                student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
                lessons: [{time: Number, date: String, summary: String}],
            }],
            upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
            reviews: [{type: mongoose.Schema.Types.ObjectId, ref: 'Review'}]
        }],
    })),
};