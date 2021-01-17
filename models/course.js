const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: String,
  joinCode: String,
  thumbnail: {type: String, default: "https://alsionschool.org/images/community/gallery/Beach.jpg"},
  description: String,
  active: Boolean,
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  students: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
  blocked: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
  lessons: Number,
  tutors: [{
    tutor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    slots: {type: Number, default: 0},
    available: {type: Boolean, default: true},
    bio: String,
    dateJoined: Date,
    students: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
    formerStudents: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
    rooms: [
      {
        student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'},
        default: []
      }
    ],
    lessons: [
      {
        student: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        time: Number,
        summary: String,
        default: []
      }
    ],
    reviews: [{
      review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PostComment',
      },
      rating: Number,
      default: []
    }],
    default: []
  }],
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Course', courseSchema);
