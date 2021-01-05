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
  students: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []
  }],
  tutors: [{
    tutor: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    available: {type: Boolean, default: true},
    bio: String,
    students: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}],
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
