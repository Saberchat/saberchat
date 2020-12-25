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
    type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []
  }],
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Course', courseSchema);
